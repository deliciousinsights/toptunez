import bunyan from 'bunyan'
import chalk from 'chalk'
import restify from 'restify'
import restifyErrors from 'restify-errors'

import { createServer } from './app.js'

const PORT = Number(process.env.PORT) || 3000

initServer()

function cleanUp(server) {
  console.log(chalk`{cyan ${server.name} REST server shutting down…}`)
  server.close(() => {
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
}
