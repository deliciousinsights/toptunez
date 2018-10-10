import { ApolloServer } from 'apollo-server'
import chalk from 'chalk'
import { config as configEnv } from 'dotenv-safe'

import { apolloHSTS, DEFAULT_CORS_OPTIONS as cors } from './util/middlewares.js'
import { auth, getUserFromReq } from './util/graphql-jwt.js'
import connection from './db/connection.js'
import schema from './schema/index.js'

configEnv()

const PORT = process.env.PORT || 3001

connection.on('open', initServer)

async function cleanUp(server) {
  console.log(chalk`{cyan TopTunez GraphQL server shutting down…}`)
  await server.stop()
  await connection.close()
  console.log(chalk`{green TopTunez GraphQL server shutdown complete}`)
}

async function initServer() {
  const options = {
    ...schema,
    context: getUserFromReq,
    cors: {
      allowedHeaders: cors.allowHeaders,
      exposedHeaders: cors.exposeHeaders,
      maxAge: cors.preflightMaxAge,
      origin: cors.origins,
    },
    plugins: [apolloHSTS()],
    schemaDirectives: { auth: auth.directive },
    tracing: true,
  }

  if (process.env.APOLLO_KEY) {
    options.engine = { reportSchema: true }
  }

  const server = new ApolloServer(options)
  const { url } = await server.listen(PORT)
  console.log(
    chalk`🚀  {green TopTunez GraphQL server ready at} {cyan.underline ${url}}`
  )

  // Graceful shutdown
  process.on('SIGTERM', () => cleanUp(server))
}
