const config = require('./config')

const filters = {
  C: {},
  R: {},
  U: {},
  D: {}
}

// id:1,eq:0+,ne:0+,gt:0+,ge:0+,lt:0+,le:0+,like:0+,offset:0+,limit:0+,desc:0+,asc:0+
const cf_regex = /(\d+)([+-]?)(\d*)/

Object.keys(config.api.filters).forEach(api_op => {
  const cfs = config.api.filters[api_op].split(',')
  if (cfs) {
    cfs.forEach(cf => {
      if (cf && cf.trim() !== '') {
        const tokens = cf.split(':')
        if (!tokens || tokens.length !== 2) { throw new Error(`Was not able to parse config filter expression ${cf} for: ${cfs}`) }

        const op = tokens[0].toLowerCase()
        const parts = tokens[1].match(cf_regex)
        const min = parseInt(parts[1])
        const range = parts[2]
        let max
        if (min === undefined || min === null) { throw new Error(`minimum number is required for expression ${cf}`) }
        if (range === '+') { max = Number.MAX_SAFE_INTEGER } else if (range === '-') { max = parseInt(parts[3]) } else if ((range === undefined || range.trim() === '') && max === undefined) {
          max = min
        } else {
          throw new Error(`maximum number is required for expression ${cf}`)
        }
        const op_filters = filters[api_op]
        if (op_filters[op]) {
          throw new Error(`Duplicate filter in config for ${api_op}: ${op}`)
        }
        op_filters[op] = {
          name: op,
          min: min,
          max: max,
          get: filter_function(op)
        }
      }
    })
  }
})

function filter_function (op) {
  switch (op) {
    case 'id': return field_op_val
    case 'in': return field_op_arr
    case 'eq': return field_op_val
    case 'ne': return field_op_val
    case 'gt': return field_op_val
    case 'ge': return field_op_val
    case 'lt': return field_op_val
    case 'le': return field_op_val
    case 'like': return field_op_val
    case 'ilike': return field_op_val
    case 'offset': return op_numval
    case 'limit': return limit
    case 'order_desc': return order
    case 'order_asc': return order
    default: throw new Error(`undefined operation ${op}`)
  }
}

function limit (fdesc, query, val) {
  const f = op_numval(fdesc, query, val)
  if (f.val > config.api.max_limit) { f.val = config.api.max_limit }
  return f
}

function op_numval (fdesc, query, val) {
  const num = parseInt(val)
  if (!Number.isInteger(num) | num < 0) { throw new Error(`Expected positive number for ${fdesc.name}`) }
  return { op: fdesc.name, val: num }
}

function field_op_val (fdesc, query, val, field) {
  return { field: field, op: fdesc.name, val: val }
}

function field_op_arr (fdesc, query, val, field) {
  // TBD: make double quotes do their difference
  const arr = val.split(',').map(e => e.replace(/^"|"$/g, ''))
  return { field: field, op: fdesc.name, val: arr }
}

function order (fdesc, query, val) {
  if (!val) {
    return `${fdesc.name} filter requires value`
  }
  const fields = val.split(',')
  const mismatch = fields.find(f => !query.api.fields[f])
  if (mismatch) {
    return `${fdesc.name} filter requires valid fields for the entity: ${mismatch}`
  }
  return { op: fdesc.name, val: fields }
}

function parse (req, query) {
  Object.keys(req.query).forEach(param => {
    if (Object.prototype.hasOwnProperty.call(req.query, param)) {
      let field
      const fdesc = query.api.fields[param]
      const arr = Array.isArray(req.query[param]) ? req.query[param] : [req.query[param]]
      arr.forEach(val => {
        let op
        if (fdesc) {
          field = fdesc.name
          // identify filter from expression
          const i = val.indexOf('=')
          // composite filter syntax, split actual operation and value
          if (i > -1) {
            op = val.substr(0, i)
            val = val.substr(i + 1)
          } else {
            // Simple field 'eq' value filter
            op = 'eq'
          }
        } else {
          // Filter op is a param
          op = param
        }
        // at this point op has to be defined
        if (!op) {
          throw new Error(`could not identify operation from param: ${param}`)
        }
        // assemble and validate filter
        const err = add_filter(query, op, val, field)
        if (err) { throw new Error(err) }
      })
    }
  })
}

function add_filter (query, op, val, field) {
  if (!query.operation) {
    return 'There is no query operation defined'
  }
  const builder = filters[query.operation][op.toLowerCase()]
  if (!builder || builder === undefined) {
    return `filter ${op} is not supported by ${query.operation} operation`
  }
  const filter = builder.get(builder, query, val, field)
  const err = validate_limits(query, filter)
  if (err) { return err }
  query.filters.push(filter)
}

function validate_limits (query) {
  if (query.filters.length > config.api.max_filters) {
    return 'Exceeded maximum allowed number of filters'
  }
}

module.exports.parse = parse
module.exports.add_filter = add_filter
