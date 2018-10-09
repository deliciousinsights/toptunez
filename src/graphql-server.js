import { ApolloServer } from 'apollo-server'
import chalk from 'chalk'

import connection from './db/connection.js'
import schema from './schema/index.js'

const PORT = process.env.PORT || 3001

connection.on('open', initServer)

async function cleanUp(server) {
  console.log(chalk`{cyan TopTunez GraphQL server shutting down…}`)
  await server.stop()
  await connection.close()
  console.log(chalk`{green TopTunez GraphQL server shutdown complete}`)
}

async function initServer() {
  const options = { ...schema, tracing: true }

  const server = new ApolloServer(options)
  const { url } = await server.listen(PORT)
  console.log(
    chalk`🚀  {green TopTunez GraphQL server ready at} {cyan.underline ${url}}`
  )

  // Graceful shutdown
  process.on('SIGTERM', () => cleanUp(server))
}
