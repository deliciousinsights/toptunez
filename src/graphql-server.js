// Serveur frontal GraphQL
// =======================

import { ApolloServer } from 'apollo-server'
import chalk from 'chalk'
import { config as configEnv } from 'dotenv-safe'

import { apolloHSTS, DEFAULT_CORS_OPTIONS as cors } from './util/middlewares.js'
import { auth, getUserFromReq } from './util/graphql-jwt.js'
import connection from './db/connection.js'
import schema from './schema/index.js'

// Vu qu’on a besoin de certaines variables d’environnement, pour le dev et les
// tests on s’assure que `dotenv-safe` les a récupérées et mises en place dans
// `process.env`.
configEnv()

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
  // Pour plus de détails sur les options autorisées par le serveur Apollo,
  // [consultez la doc
  // dédiée](https://www.apollographql.com/docs/apollo-server/api/apollo-server.html#constructor-options-lt-ApolloServer-gt).
  const options = {
    ...schema,
    // Habilleur de contexte (ici, authentification JWT et MFA)
    context: getUserFromReq,
    // Gestion des requêtes cross-origin (CORS)
    cors: {
      allowedHeaders: cors.allowHeaders,
      exposedHeaders: cors.exposeHeaders,
      maxAge: cors.preflightMaxAge,
      origin: cors.origins,
    },
    // Notre plugin pour les en-têtes de réponse HSTS
    plugins: [apolloHSTS()],
    // L'enregistrement de la directive @auth (déclarée dans le schéma)
    schemaDirectives: { auth: auth.directive },
    // Activation du *tracing de requêtes*, très utile en dev dans le GraphQL
    // Playground.
    tracing: true,
  }

  // Si la clé d’environnement `APOLLO_KEY` est là et qu’on se connecte donc
  // au Apollo Engine (qui fait partie de Apollo Studio, on demande à
  // commencer par envoyer le schéma à jour au monitoring).
  if (process.env.APOLLO_KEY) {
    options.engine = { reportSchema: true }
  }

  const server = new ApolloServer(options)
  // Et hop, écoute HTTP !
  const { url } = await server.listen(PORT)
  console.log(
    chalk`🚀  {green TopTunez GraphQL server ready at} {cyan.underline ${url}}`
  )

  // Graceful shutdown
  process.on('SIGTERM', () => cleanUp(server))
}
