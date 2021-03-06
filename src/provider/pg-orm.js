const client = require('./pg-client')


const sqlprep = {C:insert, R: select, U: update, D: delete_}
const system_fields = ['id']

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
            client.protected.query('SELECT * from auth.authenticate($1, $2)', [query.auth.token, query.auth.device])
              .then(result => {
                if (result.rows[0].authenticate) {
                  console.log(`authenticated user ${result.rows[0].authenticate}`)
                  try {
                    client.protected.query(sql, params)
                      .then(res => {
                        client.protected.query('SELECT * from auth.end_authentication()')
                        done(null, unfold(res.rows, query))
                      })
                  } catch (err) {
                    client.protected.query('SELECT * from auth.end_authentication()')
                    done(`query error: ${err}`)
                  }
                } else {
                  done('Could not receive authentication')
                }
              })
              .catch(e => done(`authentication error: ${e}`))
          }
        } else { // public api
          client.public.query(sql, params)
            .then(res => {
              done(null, unfold(res.rows, query))
            })
            .catch(e => done(`query error: ${e}`))
        }
      }
    })
  }
  catch (e) {
    console.error(e)
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
  const columns = Object.values(q.api.fields).map(function(v) {return v.column_name + ' as ' + v.name})
  let collector = {where: [], params: []}
  if (q.filters.length > 0) {
    q.filters.forEach(function (f) {
      let sqlop = sql_filter_operation[f.op]
      if (sqlop.where) {
        sqlop.add(sqlop, q, f, collector)
      }
    })
  }
  const sql = `SELECT ${columns.join(', ')} FROM ${q.api.db_schema}.${q.api.db_table} ${where(collector)} LIMIT ${limit} OFFSET 0`
  done(sql, collector.params)
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
  let collector = {where: [], params: sql_params}
  if (q.filters.length > 0) {
    q.filters.forEach(function (f) {
      let sqlop = sql_filter_operation[f.op]
      if (sqlop.where) {
        sqlop.add(sqlop, q, f, collector)
      }
    })
  }
  const sql = `UPDATE ${q.api.db_schema}.${q.api.db_table} SET ${columns.join(', ')} ${where(collector)}`
  done(sql, sql_params)
}

function delete_(q, done) {
  let collector = {where: [], params: []}
  if (q.filters.length > 0) {
    q.filters.forEach(function (f) {
      let sqlop = sql_filter_operation[f.op]
      if (sqlop.where) {
        sqlop.add(sqlop, q, f, collector)
      }
    })
  }
  const sql = `DELETE FROM ${q.api.db_schema}.${q.api.db_table} ${where(collector)}`
  done(sql, collector.params)
}

function where(collector) {
  return collector.where.length
      ? `WHERE ${collector.where.join(' AND ')}`
      : ''
}

function isEmpty(o) {
  return !o
    || (typeof o === "object" && Object.entries(o).length === 0)
    || (Array.isArray(o) && o.length === 0)
}

const sql_filter_operation = {
  id: {where: true, op: '=', add: field_val},
  eq: {where: true, op: '=', add: field_val},
  ne: {where: true, op: '!=', add: field_val},
  gt: {where: true, op: '>', add: field_val},
  ge: {where: true, op: '>=', add: field_val},
  lt: {where: true, op: '<', add: field_val},
  le: {where: true, op: '<=', add: field_val},
  in: {where: true, op: 'IN', add: in_val},
  like: {where: true, op: 'LIKE', add: field_val},
  offset: {offset: true, op: 'OFFSET'},
  limit: {limit: true, op: 'LIMIT'},
  desc: {order: true, op: 'DESC'},
  asc: {order: true, op: 'ASC'}
}

function field_val(sqlop, q, f, cl) {
  cl.where.push(`${q.api.fields[f.field].column_name} ${sqlop.op} $${cl.params.length +1}`)
  cl.params.push(wrap_val(sqlop, f.val))
}

function in_val(sqlop, q, f, cl) {
  if (!Array.isArray(f.val)) {
    throw new Error(`${sqlop.op} requires an array of parameters`)
  }
  let i = cl.params.length
  const inlist = f.val.map(v => `$${++i}`)
  cl.where.push(`${q.api.fields[f.field].column_name} ${sqlop.op} (${inlist.join(', ')})`)
  cl.params.concat(f.val.map(v => wrap_val(sqlop, v)))
}

function wrap_val(sqlop, v) {
  switch(sqlop.op) {
    case 'LIKE': return `%${v}%`
  }
  return v
}

module.exports.execute = execute;
