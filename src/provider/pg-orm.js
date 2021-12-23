const pool = require('./pg-pool')
const config = require('../config')

const sqlprep = { C: insert, R: select, U: update, D: delete_ }
const system_fields = ['id']

async function execute (query, done) {
  try {
    sqlprep[query.operation](query, (sql, params) => {
      if (!sql) {
        done('sqlnoop')
      } else {
        console.log(`sql: ${sql}, params: ${params}`)
        if (query.api.auth) {
          if (!query.auth.token || !query.auth.device) {
            done('auth required')
          } else {
            pool.auth((client, release) => {
              client.query(config.orm.auth_query, [query.auth.token, query.auth.device])
                .then(result => {
                  if (result.rows[0].authenticate) {
                    console.log(`authenticated user ${result.rows[0].authenticate}`)
                    try {
                      client.query(sql, params)
                        .then(res => {
                          client.query(config.orm.end_auth_query)
                          done(null, unfold(res.rows, query))
                          release()
                        })
                    } catch (err) {
                      client.query(config.orm.end_auth_query)
                      done(`query error: ${err}`)
                      release()
                    }
                  } else {
                    done('Could not receive authentication')
                    release()
                  }
                })
                .catch(e => {
                  done(`authentication error: ${e}`)
                  release()
                })
            })
          }
        } else { // public api
          pool.public((client, release) => {
            client.query(sql, params)
              .then(res => {
                done(null, unfold(res.rows, query))
                release()
              })
              .catch(e => {
                done(`query error: ${e}`)
                release()
              })
          })
        }
      }
    })
  } catch (e) {
    console.error(e)
    done(`Unable to process api ${query.api.name} - ${e}`)
  }
}

function unfold (rows, q) {
  if (rows && rows.length === 1 && (
    (q.operation === 'R' && q.filters && q.filters.find(f => f.field === 'id')) ||
     q.operation === 'C' || q.operation === 'U' || q.operation === 'D')) {
    return rows[0]
  }
  return rows
}

function select (q, done) {
  const collector = { params: [] }
  const columns = Object.values(q.api.fields).map(function (v) { return v.column !== v.name ? v.column + ' as ' + v.name : v.column })
  process_filters(q, collector)
  const sql = `SELECT ${columns.join(', ')} FROM ${q.api.schema}.${q.api.table}${where(collector.where)}${limits(collector.limit)}${order_by(collector.order)}`
  done(sql, collector.params)
}

function insert (q, done) {
  const sql_params = []
  const values = []
  const columns = []
  let i = 0
  Object.keys(q.payload).filter(k => !(system_fields.includes(k))).forEach(k => {
    const p = q.payload[k]
    if (!isEmpty(p)) {
      columns.push(q.api.fields[k].column)
      values.push(`$${++i}`)
      sql_params.push((typeof p === 'object' || Array.isArray(p)) ? JSON.stringify(p) : p)
    }
  })
  let sql = `INSERT INTO ${q.api.schema}.${q.api.table} (${columns.join(', ')}) VALUES (${values.join(', ')})`
  if (q.api.fields.id) {
    const id = q.api.fields.id
    sql += ` RETURNING ${id.column !== id.name ? id.column + ' as ' + id.name : id.column}`
  }
  done(sql, sql_params)
}

function update (q, done) {
  const collector = { params: [] }
  const columns = []
  let i = 0
  Object.keys(q.payload).filter(k => !(system_fields.includes(k))).forEach(k => {
    const p = q.payload[k]
    if (!isEmpty(p)) {
      columns.push(`${q.api.fields[k].column} = $${++i}`)
      collector.params.push((typeof p === 'object' || Array.isArray(p)) ? JSON.stringify(p) : p)
    }
  })
  process_filters(q, collector)
  const sql = `UPDATE ${q.api.schema}.${q.api.table} SET ${columns.join(', ')}${where(collector.where)}`
  done(sql, collector.params)
}

function delete_ (q, done) {
  const collector = { params: [] }
  process_filters(q, collector)
  const sql = `DELETE FROM ${q.api.schema}.${q.api.table}${where(collector.where)}`
  done(sql, collector.params)
}

function process_filters (q, collector) {
  if (q.filters.length > 0) {
    q.filters.forEach(function (f) {
      const sqlop = sql_filter_operation[f.op]
      if (!sqlop) { throw new Error(`There was no such sql op for : ${f.op}`) }
      let coll = collector[sqlop.group]
      if (!coll) {
        coll = JSON.parse(sql_group_template[sqlop.group])
        collector[sqlop.group] = coll
      }
      sqlop.add(sqlop, q, f, collector)
    })
  }
  return collector
}

function where (stmt) {
  return stmt && stmt.length
    ? ` WHERE ${stmt.join(' AND ')}`
    : ''
}

function limits (stmt) {
  const lim = parseInt(stmt && stmt.limit ? stmt.limit : config.api.default_limit)
  const off = stmt && stmt.offset ? parseInt(stmt.offset) : 0
  return ` LIMIT ${lim} OFFSET ${off}`
}

function order_by (stmt) {
  return stmt && stmt.length
    ? ' ORDER BY ' + stmt.map(o => `${o.column} ${o.order}`).join(', ')
    : ''
}

function isEmpty (o) {
  return !o ||
    (typeof o === 'object' && Object.entries(o).length === 0) ||
    (Array.isArray(o) && o.length === 0)
}

const sql_filter_operation = {
  id: { group: 'where', op: '=', add: field_val },
  eq: { group: 'where', op: '=', add: field_val },
  ne: { group: 'where', op: '!=', add: field_val },
  gt: { group: 'where', op: '>', add: field_val },
  ge: { group: 'where', op: '>=', add: field_val },
  lt: { group: 'where', op: '<', add: field_val },
  le: { group: 'where', op: '<=', add: field_val },
  in: { group: 'where', op: 'IN', add: in_val },
  like: { group: 'where', op: 'LIKE', add: field_val },
  offset: { group: 'limit', op: 'OFFSET', add: limit },
  limit: { group: 'limit', op: 'LIMIT', add: limit },
  order_desc: { group: 'order', op: 'DESC', add: order },
  order_asc: { group: 'order', op: 'ASC', add: order }
}

const sql_group_template = {
  where: JSON.stringify([]),
  limit: JSON.stringify({}),
  order: JSON.stringify([])
}

function field_val (sqlop, q, f, cl) {
  cl[sqlop.group].push(`${q.api.fields[f.field].column} ${sqlop.op} $${cl.params.length + 1}`)
  cl.params.push(wrap_val(sqlop, f.val))
}

function in_val (sqlop, q, f, cl) {
  if (!Array.isArray(f.val)) {
    throw new Error(`${sqlop.op} requires an array of parameters`)
  }
  let i = cl.params.length
  const inlist = f.val.map(() => `$${++i}`)
  cl[sqlop.group].push(`${q.api.fields[f.field].column} ${sqlop.op} (${inlist.join(', ')})`)
  cl.params.push.apply(cl.params, f.val.map(v => wrap_val(sqlop, v)))
}

function limit (sqlop, q, f, cl) {
  cl[sqlop.group][f.op] = parseInt(f.val)
}

function order (sqlop, q, f, cl) {
  const c = cl[sqlop.group]
  f.val.forEach(v => {
    c.push({ column: q.api.fields[v].column, order: sqlop.op })
  })
}

function wrap_val (sqlop, v) {
  switch (sqlop.op) {
    case 'LIKE': return `%${v}%`
  }
  return v
}

module.exports.execute = execute
