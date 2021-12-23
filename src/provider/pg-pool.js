const config = require('../config')
const { Pool } = require('pg')

let public_pool
let auth_pool

if (config.db) {
  public_pool = new Pool({
    host: config.db.public.host,
    database: config.db.public.database,
    user: config.db.public.user,
    password: config.db.public.password,
    port: config.db.public.port,
    max: config.db.public.max_connections,
    idleTimeoutMillis: config.db.public.idle_timeout,
    connectionTimeoutMillis: config.db.public.connect_timeout
  })

  if (config.db.auth) {
    auth_pool = new Pool({
      host: config.db.auth.host,
      database: config.db.auth.database,
      user: config.db.auth.user,
      password: config.db.auth.password,
      port: config.db.auth.port,
      max: config.db.auth.max_connections,
      idleTimeoutMillis: config.db.auth.idle_timeout,
      connectionTimeoutMillis: config.db.auth.connect_timeout
    })
  }
}

function get_client_public (ready) {
  public_pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client', err.stack)
    }
    ready(client, release)
  })
}

function get_client_auth (ready) {
  auth_pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client', err.stack)
    }
    ready(client, release)
  })
}

module.exports.public = get_client_public
module.exports.auth = get_client_auth
