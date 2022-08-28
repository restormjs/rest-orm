const args = require('../src/args')

let effective_config

if (args.config) {
  const fs = require('fs')
  effective_config = JSON.parse(fs.readFileSync(args.config))
  if (!effective_config) {
    console.error(`Could not load config from ${args.config}`)
    process.exit(-1)
  }
} else {
  const default_config = {
    server: {
      max_query_params: 10
    },
    api: {
      path_prefix: '/api',
      max_filters: 10,
      default_limit: 20,
      max_limit: 100,
      filters: {
        C: '',
        R: 'id:0-1,eq:0+,ne:0+,gt:0+,ge:0+,lt:0+,le:0+,like:0+,ilike:0+,in:0+,offset:0-1,limit:0-1,order_desc:0-1,order_asc:0-1',
        U: 'id:1',
        D: 'id:1'
      },
      auth_header: 'x-rs-authtoken'
    },
    orm: {
      provider: './provider/inmem-orm'
    }
  }

  const config = require('../config.json')
  const environment = process.env.NODE_ENV || 'development'
  if (!config[environment]) throw new Error('no config for env: ' + environment)
  effective_config = deepMerge(default_config, config[environment])
}

// Credits: curveball from stackoverflow.com (https://stackoverflow.com/users/7355533/curveball)
function deepMerge (target, source) {
  if (typeof target !== 'object' || typeof source !== 'object') return false // target or source or both ain't objects, merging doesn't make sense
  for (const prop in source) {
    if (!Object.prototype.hasOwnProperty.call(source, prop)) continue // take into consideration only object's own properties.
    if (prop in target) { // handling merging of two properties with equal names
      if (typeof target[prop] !== 'object') {
        target[prop] = source[prop]
      } else {
        if (typeof source[prop] !== 'object') {
          target[prop] = source[prop]
        } else {
          if (target[prop].concat && source[prop].concat) { // two arrays get concatenated
            target[prop] = target[prop].concat(source[prop])
          } else { // two objects get merged recursively
            target[prop] = deepMerge(target[prop], source[prop])
          }
        }
      }
    } else { // new properties get added to target
      target[prop] = source[prop]
    }
  }
  return target
}

if (args['root-spec']) {
  effective_config.api.paths['/'] = args['root-spec']
}

function bindEnvironment (config) {
  if (typeof config !== 'object') return false
  for (const prop in config) {
    if (!Object.prototype.hasOwnProperty.call(config, prop)) continue // take into consideration only object's own properties.
    const val = config[prop]
    if (typeof val === 'object') {
      if (val.ENV) {
        config[prop] = process.env[val.ENV]
      } else {
        bindEnvironment(val)
      }
    } else if (val.concat) {
      // Walk through array
      for (const el in val) {
        bindEnvironment(el)
      }
    }
  }
  return config
}

module.exports = bindEnvironment(effective_config)
