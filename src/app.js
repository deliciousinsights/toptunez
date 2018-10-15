// Cœur de serveur REST
// ====================
//
// Une bonne pratique récurrente consiste à séparer le cœur de nos serveurs (la
// définition des routes, middlewares, etc.) de leur écoute HTTP ; ça permet
// notamment de faciliter les tests, en isolant aisément les diverses instances
// du serveur d’un test à l’autre, voire en parallélisant les tests.
//
// Ce fichier fournit une fonction `createServer()` comme export par défaut,
// dont l’appel construit un serveur Restify pleinement configuré pour nos
// besoins, mais qui n’ouvre aucune écoute HTTP : ce sera, en exploitation
// directe, le rôle de `server.js`, présent dans le même dossier.

import errors from 'restify-errors'
import restify from 'restify'
import restifyValidation from 'node-restify-validation'

import { cors, hsts, jwt, totpCheck } from './util/middlewares.js'
import { setupTuneRoutes } from './controllers/tunes.js'
import { setupUserRoutes } from './controllers/users.js'

// Petits tweaks de compensation le temps que Restify 7 et son écosystème se
// recalent…
import './util/expose-restify-route-expandos.js'

const APP_NAME = 'TopTunez'

// La fameuse fonction de configuration de serveur, notre export par défaut.
export function createServer() {
  const corsMW = cors()
  // 1. Le serveur Restify à proprement parler.  Son nom sera consultable *a
  //    posteriori* dans `server.name`.  [De nombreuses options
  //    existent](http://restify.com/docs/server-api/#createserver).
  const server = restify.createServer({ name: APP_NAME })

  // Plugins « pre »
  // ---------------
  //
  // Leur exécution est garantie en amont du reste des plugins, middlewares et
  // gestionnaires de routes.  L’ordre est significatif.  Vous trouverez [leurs
  // détails ici](http://restify.com/docs/plugins-api/#serverpre-plugins).
  server.pre(restify.plugins.pre.dedupeSlashes())
  server.pre(restify.plugins.pre.sanitizePath())
  server.pre(restify.plugins.pre.strictQueryParams())
  server.pre(restify.plugins.pre.userAgentConnection())

  // Pre-check des requêtes Preflight (OPTIONS) en mode CORS.
  server.pre(corsMW.preflight)
  // Pre-check de décodage / vérification de signature des authentifications
  // éventuelles par JWT.
  server.pre(jwt())
  // Pre-check de vérification de MFA éventuel pour l’utilisateur actif, s’îl y
  // en a un.
  server.pre(totpCheck())

  // À moins d’être en test (où on veut pouvoir aller aussi vite que la machine
  // le permet), on appliquera un *Rate Limiting*. Restify fournit un plugin
  // absolument nickel pour ça.
  if (process.env.NODE_ENV !== 'test') {
    server.use(
      restify.plugins.throttle({
        burst: 5,
        ip: true,
        rate: 1,
        setHeaders: true,
      })
    )
  }

  // Plugins « use »
  // ---------------
  //
  // Leur exécution a lieu après les « pre », l’ordre restant significatif.

  // Vérification de disponibilité d’au moins un des types de contenus attendus
  // (en-tête HTTP de requête `Accept:`), en fonction des types enregistrés par
  // notre serveur.
  server.use(restify.plugins.acceptParser(server.acceptable))
  // Analyse de la *query string* pour stockage en tant qu’objet,
  // potentiellement vide, dans `req.query` (sans duplication débile dans
  // `req.params`).
  server.use(restify.plugins.queryParser({ mapParams: false }))
  // Analyse du corps de requête, si c’est du JSON, pour stockage en tant
  // qu’objet dans `req.body`.
  server.use(restify.plugins.jsonBodyParser())
  // Exigence HTTPS pour les requêtes à venir (HSTS).  Plus de détails dans la
  // doc de ce middleware, dans `src/util/middlewares.js`
  server.use(hsts())
  // Vérification de conformité des appels CORS (issus d’une autre origine que
  // la nôtre).
  server.use(corsMW.actual)

  // Validateur de requêtes (exploite les déclarations `validation` dans les
  // descripteurs de routes du serveur ; voir les fichiers dans
  // `src/controllers/` pour des exemples concrets).
  server.use(
    restifyValidation.validationPlugin({
      forbidUndefinedVariables: true,
      errorHandler: errors.BadRequestError,
      validatorModels: restifyValidation.validatorModels,
    })
  )

  // Ajout des routes des différentes ressources : Morceaux et Utilisateurs
  setupTuneRoutes(server)
  setupUserRoutes(server)

  return server
}
