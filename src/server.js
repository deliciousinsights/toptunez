import bunyan from 'bunyan'
import chalk from 'chalk-template'
import restify from 'restify'
import restifyErrors from 'restify-errors'

import connection from './db/connection.js'
import { createServer } from './app.js'

const PORT = Number(process.env.PORT) || 3000

connection.on('open', initServer)

function cleanUp(server) {
  console.log(chalk`{cyan ${server.name} REST server shutting down…}`)
  server.close(async () => {
    await connection.close()
    console.log(chalk`{green ${server.name} REST server shutdown complete}`)
  })
}

function initServer() {
  const server = createServer()

  server.on(
    'after',
    restify.plugins.auditLogger({
      log: bunyan.createLogger({
        name: 'audit',
        serializers: { err: restifyErrors.bunyanSerializer },
        stream: process.stdout,
      }),
      event: 'after',
    })
  )

  server.listen(PORT, () => {
    console.log(
      chalk`{green ✅  ${server.name} REST server started at} {cyan.underline ${server.url}}`
    )
  })

  // Graceful shutdown
  process.on('SIGTERM', () => cleanUp(server))
  process.on('SIGINT', () => cleanUp(server))
}
