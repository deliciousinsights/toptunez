// Serveur frontal GraphQL
// =======================

import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import bodyParser from 'body-parser'
import chalk from 'chalk-template'
import cors from 'cors'
import { createServer } from 'http'
import express from 'express'
import { expressMiddleware } from '@apollo/server/express4'

import {
  apolloHSTS,
  DEFAULT_CORS_OPTIONS as corsConfig,
} from './util/middlewares.js'
import { buildSchema, validationRules } from './schema/index.js'
import connection from './db/connection.js'
import { getUserFromReq } from './util/graphql-jwt.js'

// Par défaut, notre serveur 100% GraphQL ouvre sur le port 3001, à la racine du
// domaine.
const PORT = process.env.PORT || 3001

// Sans base, point de salut : on conditionne l’écoute HTTP à la bonne connexion
// à la base MongoDB.
connection.on('open', initServer)

// Graceful shutdown
// -----------------
//
// Une fois le serveur lancé, on réagit avec ce gestionnaire au signal SIGTERM,
// qui nous serait envoyé par l’environnement d’hébergement pours demander un
// arrêt propre et rapide, par exemple dans le cadre d’une reconfiguration
// élastique.
async function cleanUp(server) {
  console.log(chalk`{cyan TopTunez GraphQL server shutting down…}`)
  // On commence par fermer la socket d’écoute, afin de ne plus accepter de
  // requête HTTP entrante ; on traite toujours celles déjà acceptées et en
  // cours.
  await server.stop()
  // On peut ensuite attendre la fermeture de la connexion MongoDB ; idem,
  // celle-ci attendra que ses requêtes en cours soient terminées.
  await connection.close()
  console.log(chalk`{green TopTunez GraphQL server shutdown complete}`)
}

// Lancement du serveur Apollo
// ---------------------------
//
// C’est ici qu’on configure le serveur et qu’on active l’écoute HTTP.  Une fois
// établi, il inscrit aussi le gestionnaire de *graceful shutdown* (qui n’a pas
// d’utilité avant cela).
async function initServer() {
  const expressApp = express()
  const httpServer = createServer(expressApp)
  // Pour plus de détails sur les options autorisées par le serveur Apollo,
  // [consultez la doc
  // dédiée](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#options).
  const options = {
    schema: buildSchema(),
    plugins: [
      apolloHSTS(),
      new ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
    validationRules,
  }

  const server = new ApolloServer(options)
  await server.start()

  expressApp.use(
    '/graphql',
    cors(corsConfig),
    bodyParser.json(),
    expressMiddleware(server, { context: getUserFromReq })
  )
  // Et hop, écoute HTTP !
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve))
  console.log(
    chalk`🚀  {green TopTunez GraphQL server ready at} {cyan.underline http://localhost:${PORT}/graphql}`
  )

  // Graceful shutdown
  process.on('SIGTERM', () => cleanUp(server))
  process.on('SIGINT', () => cleanUp(server))
}
