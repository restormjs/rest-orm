const { Client } = require('pg')
const config = require('../config');

// TBD - use pools
const client = new Client({
    user: config.db.public.user,
    host: config.db.public.host,
    database: config.db.public.database,
    password: config.db.public.password,
    port: config.db.public.port,
})

// TBD - use pools
var client_protected
if (config.db.protected) {
  client_protected = new Client({
    host: 'localhost',
    database: 'horizon',
    user: 'api_high',
    password: 'api_high',
    port: 5432
  })
  client_protected.connect();
}


client.connect()

const sqlprep = {C:insert, R: select, U: update}
const system_fields = ['id', 'user_id', 'created', 'updated']

async function execute(query, done) {
  try {
    sqlprep[query.operation](query, (sql, params) => {
      if (!sql) {
        done('sqlnoop')
      } else {
        console.log(`sql: ${sql}, params: ${params}`)
        if (query.api.protected) {
          if (!query.auth.token || !query.auth.device) {
            done('auth required')
          } else {
            client_protected.query('SELECT * from auth.authenticate($1, $2)', [query.auth.token, query.auth.device])
              .then(result => {
                if (result.rows[0].authenticate) {
                  console.log(`authenticated user ${result.rows[0].authenticate}`)
                  try {
                    client_protected.query(sql, params)
                      .then(res => {
                        client_protected.query('SELECT * from auth.end_authentication()')
                        done(null, unfold(res.rows, query))
                      })
                  } catch (err) {
                    client_protected.query('SELECT * from auth.end_authentication()')
                    done(`query error: ${err}`)
                  }
                } else {
                  done('Could not receive authentication')
                }
              })
              .catch(e => done(`authentication error: ${e}`))
          }
        } else { // public api
          client.query(sql, params)
            .then(res => {
              done(null, unfold(res.rows, query))
            })
            .catch(e => done(`query error: ${e}`))
        }
      }
    })
  }
  catch (e) {
    done(`Unable to process api ${query.api.name} - ${e}`)
  }
}

function unfold(rows, q) {
  if (rows && rows.length === 1 && (
    (q.operation === 'R' && q.filters && q.filters.find(f => f.field === 'id')) ||
     q.operation === 'C' || q.operation === 'U' || q.operation === 'D')) {
    return rows[0]
  }
  return rows
}

function select(q, done) {
  let limit = 20
  let  sql_params = []
  const columns = Object.values(q.api.fields).map(function(v) {return v.column_name + ' as ' + v.name})
  let where = ''
  if (q.filters.length > 0) {
    let w = []
    q.filters.forEach(function (f) {
      let sqlop = getFilterOperation(f.op)
      switch(sqlop) {
        case 'IN': {
          let set = f.val.split(',').map(e => e.replace(/^"|"$/g, ''))
          let i = 0
          let params = set.map(p => `$${++i}`)
          w.push(`${q.api.fields[f.field].column_name} ${sqlop} (${params.join(', ')})`)
          sql_params = sql_params.concat(set)
          limit = set.length > 100 ? 100 : set.length
          break
        }
        default: {
          w.push(`${q.api.fields[f.field].column_name} ${sqlop} $${w.length + 1}`)
          sql_params.push(getFilterValue(sqlop, f.val))
        }
      }
    })
    where = `WHERE ${w.join(' AND ')}`
  }
  const sql = `SELECT ${columns.join(', ')} FROM  ${q.api.db_schema}.${q.api.db_table} ${where} LIMIT ${limit} OFFSET 0`
  done(sql, sql_params)
}

function insert(q, done) {
  const sql_params = []
  const values = []
  const columns = []
  let i = 0
  Object.keys(q.payload).filter(k => !(system_fields.includes(k))).forEach(k => {
    const p = q.payload[k]
    if (!isEmpty(p)) {
      columns.push(q.api.fields[k].column_name)
      values.push(`$${++i}`)
      sql_params.push((typeof p === "object" || Array.isArray(p)) ? JSON.stringify(p) : p)
    }
  })
  let sql = `INSERT INTO ${q.api.db_schema}.${q.api.db_table} (${columns.join(', ')}) VALUES (${values.join(', ')})`
  if (q.api.fields.id) {
    sql += ` RETURNING ${q.api.fields.id.column_name} AS id`
  }
  done(sql, sql_params)
}

function update(q, done) {
  const sql_params = []
  const columns = []
  let i = 0
  Object.keys(q.payload).filter(k => !(system_fields.includes(k))).forEach(k => {
    const p = q.payload[k]
    if (!isEmpty(p)) {
      columns.push(`${q.api.fields[k].column_name} = $${++i}`)
      sql_params.push((typeof p === "object" || Array.isArray(p)) ? JSON.stringify(p) : p)
    }
  })
  let sql = `UPDATE ${q.api.db_schema}.${q.api.db_table} SET ${columns.join(', ')} WHERE ${q.api.fields['id'].column_name} = $${++i}`
  sql_params.push(q.filters.find(f => f.field === 'id').val)
  done(sql, sql_params)
}

function getFilterValue(op, v) {
  switch(op) {
    case 'LIKE', 'ILIKE': return `%${v}%`
  }
  return v
}

function isEmpty(o) {
  return !o
    || (typeof o === "object" && Object.entries(o).length === 0)
    || (Array.isArray(o) && o.length === 0)
}

function getFilterOperation(op) {
    switch (op.toUpperCase()) {
      case 'EQ': return '='
      case 'LIKE': return 'ILIKE'
      case 'ILIKE': return 'ILIKE'
      case 'IN': return 'IN'
      default: throw "Unexpected filter operation '" + op + "'"
    }
}

module.exports.execute = execute;
