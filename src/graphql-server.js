import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import bodyParser from 'body-parser'
import chalk from 'chalk-template'
import { createServer } from 'http'
import express from 'express'
import { expressMiddleware } from '@apollo/server/express4'

import { buildSchema, validationRules } from './schema/index.js'
import connection from './db/connection.js'
import { getUserFromReq } from './util/graphql-jwt.js'

const PORT = process.env.PORT || 3001

connection.on('open', initServer)

async function cleanUp(server) {
  console.log(chalk`{cyan TopTunez GraphQL server shutting down…}`)
  await server.stop()
  await connection.close()
  console.log(chalk`{green TopTunez GraphQL server shutdown complete}`)
}

async function initServer() {
  const expressApp = express()
  const httpServer = createServer(expressApp)
  const options = {
    schema: buildSchema(),
    plugins: [new ApolloServerPluginDrainHttpServer({ httpServer })],
    validationRules,
  }

  const server = new ApolloServer(options)
  await server.start()

  expressApp.use(
    '/graphql',
    bodyParser.json(),
    expressMiddleware(server, { context: getUserFromReq })
  )
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve))
  console.log(
    chalk`🚀  {green TopTunez GraphQL server ready at} {cyan.underline http://localhost:${PORT}/graphql}`
  )

  // Graceful shutdown
  process.on('SIGTERM', () => cleanUp(server))
  process.on('SIGINT', () => cleanUp(server))
}
