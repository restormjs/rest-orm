const config = require('./config');

let filters = {
    C: {},
    R: {},
    U: {},
    D: {}
}

// id:1,eq:0+,ne:0+,gt:0+,ge:0+,lt:0+,le:0+,like:0+,offset:0+,limit:0+,desc:0+,asc:0+
let cf_regex = /(\d+)([+-]?)(\d*)/

Object.keys(config.api.filters).forEach(api_op => {
    const cfs = config.api.filters[api_op].split(',')
    if (cfs) {
        cfs.forEach(cf => {
            if (cf && cf.trim() !== '') {
                const tokens = cf.split(':')
                if (!tokens || tokens.length != 2)
                    throw new Error(`Was not able to parse config filter expression ${cf} for: ${cfs}`)

                const op = tokens[0].toUpperCase()
                const parts = tokens[1].match(cf_regex);
                const min = parseInt(parts[1])
                const range = parts[2]
                let max
                if (min === undefined || min === null)
                    throw new Error(`minimum number is required for expression ${cf}`)
                if (range === '+')
                    max = Number.MAX_SAFE_INTEGER
                else if (range === '-')
                    max = parseInt(parts[3])
                else if ((range === undefined || range.trim() === '') && max === undefined) {
                    max = min
                }
                else {
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

function filter_function(op) {
    switch (op) {
        case 'ID': return id;
        case 'EQ': return eq;
        case 'NE': return ne;
        case 'GT': return gt;
        case 'GE': return ge;
        case 'LT': return lt;
        case 'LE': return le;
        case 'LIKE': return like;
        case 'OFFSET': return offset;
        case 'LIMIT': return limit;
        case 'DESC': return order;
        case 'ASC': return order;
        default: throw new Error(`undefined operation ${id}`)
    }
}

function id(query, val, fdesc) {
    return {field: 'id', op: fdesc.name, val: val}
}

function eq(query, val, fdesc) {
    throw new Error('Unimplemented')
}

function ne(query, val, fdesc) {
    throw new Error('Unimplemented')
}

function gt(query, val, fdesc) {
    throw new Error('Unimplemented')
}


function ge(query, val, fdesc) {
    throw new Error('Unimplemented')
}

function lt(query, val, fdesc) {
    throw new Error('Unimplemented')
}

function le(query, val, fdesc) {
    throw new Error('Unimplemented')
}

function like(query, val, fdesc) {
    throw new Error('Unimplemented')
}

function offset(query, val, fdesc) {
    throw new Error('Unimplemented')
}


function limit(query, val, fdesc) {
    throw new Error('Unimplemented')
}

function order(query, val, fdesc) {
    if (!val) {
        return `${fdesc.name} filter requires value`
    }
    let fields = val.split(',')
    const mismatch = fields.find(f => !query.api.fields[f])
    if (mismatch) {
        return `${fdesc.name} filter requires valid fields for the entity: ${mismatch}`
    }
    return {op: fdesc.name, val: fields}
}


function parse(req, query) {
    for (let param in req.query) {
        if (req.query.hasOwnProperty(param)) {
            let field = query.api.fields[param].name
            let val = req.query[param]
            let op
            if (field) {
                // identify filter from expression
                let i = val.indexOf('=')
                // composite filter syntax, split actual operation and value
                if (i > -1) {
                    op = val.substr(0, i)
                    val = val.substr(i + 1)
                }
                else {
                    // Simple field 'eq' value filter
                    op = 'eq'
                }
            }
            else {
                // Filter op is a param
                op = param
            }
            // at this point op has to be defined
            if (!op) {
                return `could not identify operation from param: ${param}`
            }
            // assemble and validate filter
            return add_filter(query, op, val)
        }
    }
}

function add_filter(query, op, val) {
    if (!query.operation) {
        throw new Error('There is no query operation defined')
    }
    const builder = filters[query.operation][op.toUpperCase()]
    if (!builder || builder === undefined) {
        return `filter ${op} is not supported by ${query.operation} operation`
    }
    const filter = builder.get(query, val, builder)
    let err = validate_limits(query, filter)
    if (err)
        return err
    query.filters.push(filter)

}

function validate_limits(query, filter) {
    if (query.filters.length > config.api.max_filters) {
        return "Exceeded maximum allowed number of filters"
    }
}

module.exports.parse = parse;
module.exports.add_filter = add_filter;

