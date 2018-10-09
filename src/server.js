import bunyan from 'bunyan'
import chalk from 'chalk'
import restify from 'restify'
import restifyErrors from 'restify-errors'

import { connectToDB } from './db/connection.js'
import { createServer } from './app.js'

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/toptunez'
const PORT = Number(process.env.PORT) || 3000

const connection = connectToDB(MONGODB_URI, initServer)

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
}
