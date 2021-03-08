const express = require('express')
const router = express.Router()
const orm = require('./orm')
const fs = require('fs')
const useragent = require('useragent')
const cors = require('cors')
const config = require('./config')
const filters = require('./filters')

const corsOptions = { origin: config.server.cors.origin }

const spec = {}
let spec_resp
{
  const paths = config.api.paths
  Object.keys(paths).forEach(key => {
    spec[key] = JSON.parse(fs.readFileSync(paths[key]))
  })
  if (!spec['/']) { throw new Error('no root spec in config paths, add ROOT (/) entry') }
  spec_resp = spec // TODO: obfuscate db info
}

router.get('/', function (req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.send(spec_resp)
})

router.get('/*', cors(corsOptions), function (req, res) {
  process(req, res)
})
router.post('/*', cors(corsOptions), function (req, res) {
  process(req, res)
})
router.patch('/*', cors(corsOptions), function (req, res) {
  process(req, res)
})

router.delete('/*', cors(corsOptions), function (req, res) {
  process(req, res)
})

router.options('/*', cors(corsOptions))

const validators = { C: before_create, R: before_read, U: before_update, D: before_delete }

function process (req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.query.length > config.server.max_params) {
    error_response(res, 400, 'Query exceeded max allowed parameters number')
  }
  const query = {
    filters: []
  }
  const paths = req.url.replace(/^\/|\/$|\?.*$/g, '').split('/')
  let i = 0
  let apis = null
  while (i < paths.length) {
    const apipath = paths[i]
    // finding mount point
    if (i === 0) {
      apis = spec[apipath]
      if (apis) {
        ++i
        continue // apis path matched, move next level
      }
      apis = spec['/'] // apis path did not match, assume root and continue with the current level
    }
    const api = apis.paths[apipath]
    if (!api) {
      return error_response(res, 404, 'Not Found')
    }
    // Check Auth token right away
    if (api.protected) {
      const auth_token = req.headers['x-hr-authtoken'] || req.query.auth_token
      query.auth = {
        token: auth_token,
        device: get_device(req.headers['user-agent'])
      }
      if (!query.auth.device || !query.auth.token) {
        return error_response(res, 401, 'not authenticated')
      }
      res.setHeader('Cache-Control', 'no-store')
    }
    // validate operation
    query.operation = get_operation(req)

    // is there a path param
    if (paths.length > i + 1) {
      const id = paths[++i]
      if (has_field(api, 'id')) {
        const err = filters.add_filter(query, 'id', id, 'id')
        if (err) {
          return error_response(res, 400, err)
        }
      }
    }
    ++i // next level
    // this was the last level so query against this api
    if (paths.length === i) {
      query.api = api
      if (!api.operations.includes(query.operation)) {
        return error_response(res, 404, 'Not Found')
      }
    }
  }

  if (!query.api) {
    return error_response(res, 404, 'Not Found')
  }

  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    query.payload = req.body
  }

  // Parse all filters
  try {
    const err = filters.parse(req, query)
    if (err) {
      return error_response(res, 400, err)
    }
  } catch (e) {
    return error_response(res, 400, e.message)
  }
  // Method specific filters and validation
  const err = validators[query.operation](req, query)
  if (err) {
    return error_response(res, 400, err)
  }

  // TODO: Pagination
  // TODO: Authentication
  // TODO: some common security defenses (SQLI, XSS, CLICKJACK, CSRF, WTF)
  orm.execute(query, function (errors, data) {
    if (errors) {
      return error_response(res, 400, errors)
    } else if (data) {
      res.status(200).send(data)
    } else {
      res.status(204).send()
    }
  })
}

function before_create (req, q) {
  if (!q.payload) {
    return 'json payload is required'
  }

  if (q.filters.length) {
    return `Create object will not accept any filters: ${q.filters.map(f => f.field)}`
  }
  const data = q.payload
  const fields = q.api.fields
  const field = Object.keys(fields)
    .filter(f => fields[f].is_required && !(['id'].includes(f)))
    .find(f => !data[fields[f].name])
  if (field) {
    return `${field} is a required field`
  }
}

function before_read () {
}

function before_update (req, q) {
  const id = q.filters.find(f => f.op === 'id')
  if (!id || !id.val) {
    return 'id is a required parameter'
  }
  if (!q.payload) {
    return 'no data to update'
  }
  if (q.payload.id && q.payload.id !== id.val) {
    return 'parameter id should match payload'
  }
}

function before_delete (req, q) {
  const id = q.filters.find(f => f.op === 'id')
  if (!id || !id.val) {
    return 'id is a required parameter'
  }
  if (q.payload) {
    return 'no payload expected'
  }
}

function has_field (api, field) {
  return Object.keys(api.fields).find(f => f === field) !== undefined
}

function get_operation (req) {
  switch (req.method) {
    case 'POST': return 'C'
    case 'GET': return 'R'
    case 'PATCH': return 'U'
    case 'DELETE': return 'D'
    default: throw new Error('Request method ' + req.method + ' has no mapping to api operation')
  }
}

function get_device (user_agent) {
  const ua = useragent.parse(user_agent)
  return `${ua.family}-${ua.os.family}${ua.os.major}-${ua.device.family}`.toLowerCase()
}

function error_response (res, status, message) {
  res.status(status || 500)
  res.send({
    message: message,
    status: status || 500,
    timestamp: new Date()
  })
}

module.exports = router
