const config = require('../config')

const { Client } = require('pg')

const ext = {
}

// TBD - use pools
if (config.db) {
  const client = new Client({
    user: config.db.public.user,
    host: config.db.public.host,
    database: config.db.public.database,
    password: config.db.public.password,
    port: config.db.public.port
  })
  client.connect()
  ext.public = client

  // TBD - use pools
  if (config.db.protected) {
    const client_protected = new Client({
      host: 'localhost',
      database: 'horizon',
      user: 'api_high',
      password: 'api_high',
      port: 5432
    })
    client_protected.connect()
    ext.protected = client_protected
  }
}

module.exports = ext
