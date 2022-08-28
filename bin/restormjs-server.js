#!/usr/bin/env node

const argv = require('../src/args')

const usage = `
RESTORMJS server
Usage:
      npx restormjs-server [args]
Arguments:
  --config=      - Configuration file. When specified, default configs would be ignored.
  --root-spec=   - Override file location for root path api specification (by default it is specified in config)
  --help         - Prints usage
Example:
  npx restormjs-server --config=config.json --root-spec=api-spec.json
`

if (argv.help) { argv.usage(usage) }

/**
 * Module dependencies.
 */

const app = require('../src/app')
const http = require('http')

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3002')
app.set('port', port)

/**
 * Create HTTP server.
 */

const server = http.createServer(app)

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort (val) {
  const port = parseInt(val, 10)

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError (error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening () {
  const addr = server.address()
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port
  console.log(`Listening: ${JSON.stringify(addr)}, bind: ${bind}`)
}

module.exports = server
