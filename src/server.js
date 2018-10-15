// Serveur frontal REST
// ====================

import bunyan from 'bunyan'
import chalk from 'chalk-template'
import restify from 'restify'
import restifyErrors from 'restify-errors'

import connection from './db/connection.js'
import { createServer } from './app.js'

// Par défaut, notre serveur 100% REST ouvre sur le port 3000.
const PORT = Number(process.env.PORT) || 3000

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
function cleanUp(server) {
  console.log(chalk`{cyan ${server.name} REST server shutting down…}`)
  // On commence par fermer la socket d’écoute, afin de ne plus accepter de
  // requête HTTP entrante ; on traite toujours celles déjà acceptées et en
  // cours.
  server.close(async () => {
    // On peut ensuite attendre la fermeture de la connexion MongoDB ; idem,
    // celle-ci attendra que ses requêtes en cours soient terminées.
    await connection.close()
    console.log(chalk`{green ${server.name} REST server shutdown complete}`)
  })
}

// Lancement du serveur HTTP
// -------------------------
//
// C’est ici qu’on configure le serveur et qu’on active l’écoute HTTP.  Une fois
// établi, il inscrit aussi le gestionnaire de *graceful shutdown* (qui n’a pas
// d’utilité avant cela).
function initServer() {
  const server = createServer()

  // Log d’audit (grappes JSON détaillées), pratique en cas de besoin
  // diagnostic.
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

  // Et hop, écoute HTTP !
  server.listen(PORT, () => {
    console.log(
      chalk`{green ✅  ${server.name} REST server started at} {cyan.underline ${server.url}}`
    )
  })

  // Graceful shutdown
  process.on('SIGTERM', () => cleanUp(server))
  process.on('SIGINT', () => cleanUp(server))
}
