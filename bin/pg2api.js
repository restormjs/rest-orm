#!/usr/bin/env node

const { Client } = require('pg')
const argv = require('../src/args')
const fs = require('fs')

const usage = `
Generates restormjs api spec from postgres database objects
Usage:
      npx restorm-pg-spec [args]
Arguments:
  --db-user=     - pg login user
  --db-passwd=   - pg login password
  --db-host=     - pg server host
  --db-port=     - pg server port (default 5432)
  --db-conn=     - pg connection string format: postgres://user:password@host:5432/database
  --db-name=     - pg database name
  --db-schema=   - pg database schema (default public)
  --output=      - Output file name. If empty, prints in stdout
  --db-tables=   - Coma separated list of tables to include in spec. When empty, looks for all tables in the schema
  --api-name=    - Name of API specification
  --api-desc=    - Description for API specification
  --api-version= - Version of api specification
  --pub-role=    - Role that identifies publicly available database objects. If empty, uses db-user as a default
  --auth-role=   - Role that identifies protected database objects. If a table granted to auth role, an autnentication will be required to access it
  --help         - Prints usage
Example:
  npx restorm-pg-spec --db-conn=postgres://restormjs:restormjs@localhost:5432/restormjs > api-spec.json
`
if (argv.help) { argv.usage(usage) }

const schema = argv['db-schema'] ? argv['db-schema'] : 'public'
const conf = {
  schema: schema,
  output: argv.output,
  tables: argv['db-tables'] ? argv['db-tables'].split(',') : undefined,
  name: argv['api-name'] ? argv['api-name'] : `${argv['db-name'] ? argv['db-name'] : 'restormjs'}-${schema} APIs`,
  desc: argv['api-desc'] ? argv['api-desc'] : `Auto generated RESTORMJS api from ${schema} schema using restorm-pg-spec`,
  version: argv['api-version'] ? argv['api-version'] : '0.0.1',
  auth_role: argv['auth-role']
}

if (argv['db-conn']) { conf.db_conn = argv['db-conn'] }
if (argv['db-user']) { conf.db_user = argv['db-user'] }
if (argv['db-host']) { conf.db_host = argv['db-host'] }
if (argv['db-name']) { conf.db_name = argv['db-name'] }
if (argv['db-passwd']) { conf.db_passwd = argv['db-passwd'] }
if (argv['db-port']) { conf.db_port = argv['db-port'] } else if (!conf.db_conn && conf.db_host) { conf.db_port = 5432 }

const client = conf.db_conn
  ? new Client({
    connectionString: conf.db_conn
  })
  : new Client({
    user: conf.db_user,
    host: conf.db_host,
    database: conf.db_name,
    password: conf.db_passwd,
    port: conf.db_port
  })

conf.pub_role = argv['pub-role'] ? argv['pub-role'] : client.user

console.error(
`---------------------------------------
Config: ${JSON.stringify(conf)}
---------------------------------------`)

client.connect(err => {
  if (err) {
    console.log(`Could not connect to posgres database: ${err.message}.
    Use npx restorm-pg-spec --help for arguments list`)
    process.exit(-1)
  }
})

const metadata_sql = `
    with table_with_pk as (
      select cu.table_name, cu.constraint_name, count(cu.constraint_name) as cnt
      from information_schema.constraint_column_usage cu
      join information_schema.table_constraints tc
        on tc.constraint_name = cu.constraint_name
        and tc.table_name = cu.table_name
        and tc.table_schema = cu.table_schema
      where tc.constraint_type = 'PRIMARY KEY'
        and cu.table_schema = $1
        ${and_tables_in('cu')}
      group by cu.table_name, cu.constraint_name
      having count(cu.constraint_name) = 1
    )
    select c.table_name, c.column_name, c.is_nullable, c.data_type, c.character_octet_length, (CASE WHEN cu.constraint_name is not null THEN '1' ELSE '0' END) as is_pk, (CASE WHEN c.column_default is not null THEN '1' ELSE '0' END) as has_default
    from information_schema.columns c
    left join table_with_pk tpk
      on tpk.table_name = c.table_name
    left join information_schema.constraint_column_usage cu
      on cu.table_schema = c.table_schema
     and cu.table_name = c.table_name
     and cu.column_name = c.column_name
     and cu.constraint_name = tpk.constraint_name
    where c.table_schema = $1
      ${and_tables_in('c')}
    order by c.table_name, is_pk desc, c.column_name`

const table_grants_sql = `
    select grantee, table_name, privilege_type
    from information_schema.role_table_grants tg
    where table_schema = $1
    and privilege_type in ('INSERT', 'SELECT', 'UPDATE', 'DELETE')
    ${and_tables_in('tg')}
    order by grantee, table_name, privilege_type`

const column_grants_sql = `
    select grantee, table_name, column_name, privilege_type
    from information_schema.column_privileges cp
    where table_schema = $1
    and privilege_type in ('INSERT', 'SELECT', 'UPDATE')
    ${and_tables_in('cp')}
    order by grantee, table_name, column_name, privilege_type`

client.query(metadata_sql, [conf.schema], (err, metadata) => {
  console.error(err || 'fetched ' + metadata.rows.length + ' columns')
  if (err || !metadata.rows || !metadata.rows.length) {
    client.end()
  } else {
    client.query(table_grants_sql, [conf.schema], (err, table_grants) => {
      console.error(err || 'fetched ' + table_grants.rows.length + ' table grants')
      if (err || !table_grants.rows || !table_grants.rows.length) {
        client.end()
      } else {
        client.query(column_grants_sql, [conf.schema], (err, column_grants) => {
          console.error(err || 'fetched ' + column_grants.rows.length + ' column grants')
          if (!err && column_grants.rows && column_grants.rows.length) {
            const paths = {}
            const ddls = metadata.rows.reduce(function (rv, x) {
              (rv[x.table_name] = rv[x.table_name] || []).push(x)
              return rv
            }, {})
            Object.keys(ddls).forEach(function (tn) {
              const is_protected = isProtected(tn, table_grants.rows, conf.auth_role)
              const role = is_protected ? conf.auth_role : conf.pub_role

              const fields = {}
              ddls[tn].forEach(function (c) {
                const name = c.is_pk === '1' ? 'id' : toFieldName(c.column_name)
                fields[name] = {
                  name: name,
                  type: toFieldType(c.data_type),
                  required: c.is_nullable === 'NO' && c.has_default !== '1',
                  column: toDbName(c.column_name),
                  grants: getFieldGrants(tn, c.column_name, column_grants.rows, role)
                }
              })
              const path = toPath(tn)
              paths[path] = {
                name: toName(tn),
                path: path,
                auth: is_protected,
                table: toDbName(tn),
                schema: conf.schema,
                grants: getApiGrants(tn, table_grants.rows, role),
                fields: fields
              }
            })
            const spec = {
              name: conf.name,
              version: conf.version,
              created: new Date(),
              description: conf.desc,
              paths: paths
            }
            console.error('generated ' + Object.keys(paths).length + ' APIs')
            if (conf.output) {
              fs.writeFile(argv.output, JSON.stringify(spec), (err) => {
                // throws an error, you could also catch it here
                if (err) throw err
                // success case, the file was saved
                console.log(`Saved to file: ${conf.output}`)
              })
            } else { console.log(JSON.stringify(spec)) }
          }
          client.end()
        })
      }
    })
  }
})

function toDbName (n) {
  return n.match(/[A-Z]/) ? '"' + n + '"' : n
}

function toName (n) {
  return n.charAt(0).toUpperCase() + n.slice(1)
}

function pluralizeMaybe (n) {
  return n.endsWith('s') || n.includes('_') ? n : `${n}s`
}

function toPath (n) {
  return pluralizeMaybe(n.toLowerCase())
}

function isProtected (tn, auth, role) {
  if (auth) {
    return auth.find(a => a.table_name === tn && a.grantee === role) !== undefined
  }
  return false
}

function getApiGrants (tn, auth, role) {
  if (auth) {
    return auth
      .filter(a => a.table_name === tn && a.grantee === role)
      .map(a => {
        switch (a.privilege_type) {
          case ('INSERT'): return 'C'
          case ('SELECT'): return 'R'
          case ('UPDATE'): return 'U'
          case ('DELETE'): return 'D'
        }
        return undefined
      })
      .sort((a, b) => {
        const sort_weights = {
          C: 0, R: 1, U: 2, D: 3
        }
        return sort_weights[a] - sort_weights[b]
      }).join('')
  }
}

function toFieldType (t) {
  switch (t.toLowerCase()) {
    case 'integer' : return 'number'
    case 'double precision': return 'number'
    case 'numeric': return 'number'
    case 'bigint': return 'number'
    case 'real': return 'number'
    case 'character varying': return 'string'
    case 'character': return 'string'
    case 'text': return 'string'
    case 'boolean': return 'boolean'
    case 'timestamp without time zone': return 'string'
    case 'date': return 'string'
    case 'jsonb': return 'string'
    case 'point': return 'string'
    default: throw new Error(`Please add mapping to field type for ${t}`)
  }
}

function toFieldName (n) {
  return n.replace(/\.?([A-Z]+)/g, function (x, y) { return '_' + y.toLowerCase() }).replace(/^_/, '')
}

function getFieldGrants (table, column, all_grants, role) {
  return all_grants.filter(g => g.grantee === role &&
      g.table_name === table && g.column_name === column).map(g => {
    switch (g.privilege_type) {
      case ('INSERT'): return 'C'
      case ('SELECT'): return 'R'
      case ('UPDATE'): return 'U'
      case ('DELETE'): return 'D'
      default: return ''
    }
  }).join('')
}

function and_tables_in (tp) {
  return conf.tables
    ? `AND ${tp}.table_name IN (${conf.tables.map(t => `'${t}'`).join(',')})`
    : ''
}
