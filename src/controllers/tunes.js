// Contrôleur REST des morceaux
// ============================

import errors from 'restify-errors'
import restify from 'restify'
import semver from 'semver'

import { requireAuth } from '../util/middlewares.js'
import Tune from '../db/Tune.js'

// On va relâcher certaines validations de requêtes en mode tests, pour
// faciliter ces derniers.
const TESTING = process.env.NODE_ENV === 'test'

// L’API de requête/réponse de Restify ne permet pour le moment pas de remonter
// vers le routeur en vigueur, on est donc réduits à récupérer une référence
// quand on peut pour usage ultérieur…
let router

// Configuration des routes
// ------------------------

// Cette fonction, l‘export par défaut du module, configure nos routes d’API
// REST sur le serveur Restify fourni. Elle est appelée depuis la configuration
// applicative de `src/app.js`
export function setupTuneRoutes(server) {
  router = server.router

  // Route : listing des morceaux, potentiellement filtré par *query string*
  server.get(
    {
      // Nommer nos routes nous permet par la suite, grâce au routeur et à sa
      // méthode `render()`, de reconstituer nos URLs automatiquement.
      name: 'listTunes',
      path: '/tunes',
      validation: {
        // Validation de la *query string*
        queries: {
          filter: { isRequired: false },
          page: { isInt: true, isRequired: false, min: 1 },
          pageSize: {
            isDivisibleBy: TESTING ? 1 : 10,
            isInt: true,
            isRequired: false,
            min: TESTING ? 1 : 10,
            max: 100,
          },
          sortBy: {
            // Note : `flatMap` est ES2019, dispo depuis Node 11 (2018).
            isIn: ['album', 'artist', 'createdAt', 'score', 'title'].flatMap(
              (field) => [field, `-${field}`]
            ),
            isRequired: false,
          },
        },
      },
    },
    // On utilise ici un `conditionalHandler` pour pouvoir basculer d’un
    // gestionnaire à l’autre suivant la version d’API demandée (en-tête de
    // requête `Accept-Version`, syntaxe semver).  Ici en pratique le
    // gestionnaire est unique, mais grâce au plugin on bénéficiera :
    //
    // 1. D’une méthode `version()` sur l’objet requête, qui indique la version
    //    demandée.
    // 2. D’un en-tête de réponse auto-rempli `api-version` qui retranscrit la
    //    version exacte ayant fourni la réponse.
    restify.plugins.conditionalHandler([
      { version: '1.0.0', handler: listTunes },
      { version: '1.2.0', handler: listTunes },
    ])
  )

  // Route : création d’un morceau
  server.post(
    {
      name: 'createTune',
      path: '/tunes',
      validation: {
        // Validation du corps de requête
        content: {
          album: { isRequired: false },
          artist: { isRequired: true },
          title: { isRequired: true },
          url: { isRequired: false, isURL: true },
        },
      },
    },
    // Middleware à nous exigeant un utilisateur authentifié et doté du ou des
    // rôles éventuels indiqués. Voir `src/utils/middlewares.js`.
    requireAuth({ role: 'admin' }),
    // Le gestionnaire à proprement parler arrive en dernier argument.
    createTune
  )

  // Route : vote sur morceau
  server.post(
    {
      name: 'voteOnTune',
      path: '/tunes/:tuneId/votes',
      validation: {
        // Validation du corps de requête
        content: {
          comment: { isRequired: false },
          offset: { isInt: true, isIn: [-1, 1] },
        },
        // Validation des paramètres de l’URL (parties dynamiques du chemin)
        resources: {
          tuneId: { isRequired: true, isMongoId: true },
        },
      },
    },
    requireAuth(),
    voteOnTune
  )
}

// Gestionnaires de routes
// -----------------------

// Gestionnaire de route : création de morceau
async function createTune(req, res) {
  const { album, artist, title, url } = req.body
  const tune = await Tune.create({ album, artist, title, url })
  res.header('X-Tune-ID', tune.id)
  res.send(201)
}

// Gestionnaire de route : listing des morceaux
async function listTunes(req, res) {
  const { filter, page, pageSize, sortBy } = req.query

  const searchArgs = { filter, page, pageSize }
  // `res.header('api-version)` est présent en raison du `conditionalHandler`
  // qui entoure la configuration du gestionnaire.  Idée de la démo : seule
  // une demande de version explicitement 1.2+ permet la prise en compte du
  // filtre `sortBy`.
  if (semver.gte(res.header('api-version'), '1.2.0')) {
    searchArgs.sorting = sortBy
  }
  const { links, tunes } = await Tune.search(searchArgs)

  // On passe de descripteurs de liens (ici des objets `{ page, pageSize }`) à
  // des URLs effectives, construites grâce à la fameuse méthode `render()` du
  // routeur.  Fournir ces liens est au cœur de HATEOAS.
  for (const [rel, query] of Object.entries(links)) {
    const url = router.render('listTunes', {}, query)
    // Remplacement des liens dans la grappe de données
    links[rel] = url
    // Construction incrémentale de l’en-tête unique `Link:` de réponse
    res.link(url, rel)
  }

  // Renvoyer un objet bascule automatiquement le type de contenu réponse
  // `application/json` : inutile d‘utiliser explicitement `res.json()`.
  res.send({ links, tunes })
}

// Gestionnaire de route : vote sur morceau
async function voteOnTune(req, res) {
  const { tuneId } = req.params
  let tune = await Tune.findById(tuneId)

  // Pas de morceau résultat ne constitue pas une exception en soi, et n’a
  // donc pas amené dans le `catch`. Mais on renvoie une 404, du coup.
  if (!tune) {
    return new errors.ResourceNotFoundError(
      {
        info: { faultyId: tuneId },
      },
      'The tune you want to vote for cannot be found'
    )
  }

  const { comment, offset } = req.body
  // On réaffecte ici car la mise à jour niveau Mongo ne se reflèterait pas
  // dans l’objet `tune` courant, donc `vote` nous en renvoie un nouveau.
  // D’où  une déclaration `let` et non `const` un peu plus haut.
  tune = await tune.vote({ comment, offset })
  // Démo au passage de `noCache()`, qui cale tous les en-têtes de réponse
  // pour empêcher la mise en cache côté client, qu’on ne souhaite pas ici.
  res.noCache().send(201, { score: tune.score, voteCount: tune.votes.length })
}
