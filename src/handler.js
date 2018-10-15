// Enrobage Serverless du serveur REST
// ===================================
//
// On fait ici au plus court, une approche transitoire classique : on enrobe un
// serveur REST complet dans un *handler* Serverless unique.  L’ensemble des
// routes HTTP frontales y amène, et le routage interne du serveur redistribue
// vers les fonctions gestionnaires.
//
// Ce n’est évidemment pas l’objectif final d’une architecture à base de
// fonctions ; avec cette approche, chaque fonction configurée embarque la
// totalité du serveur et de ses dépendances, ce qui est inutilement lourd et,
// potentiellement, coûteux.  Mais ça permet de commencer à exploiter un serveur
// existant en mode serverless (et donc, en payant à la consommation réelle, et
// non en continu).
//
// Vous trouverez la configuration des fonctions utilisant ce *handler* dans le
// fichier `serverless.yml` à la racine du projet.
//
// Toutefois, gardez à l’esprit qu’une « vraie » architecture serverless aurait
// en fait plusieurs handlers, au maximum un par fonction, sans Restify ni
// routeur, et dont les middlewares redeviendraient des fonctions classiques
// levant d’éventuelles exceptions, appelées au début de nos fonctions
// gestionnaires.  Ainsi, chaque fonction a une empreinte (code, dépendances)
// plus légère, et le découplage est meilleur.

const serverless = require('serverless-http')

const { createServer } = require('./app')
const server = createServer()
// Comme l’enrobage `serverless-http` attend une fonction de gestion de requête
// classique, et non un objet `Server` de Restify, on va chercher cette fonction
// dans son champ « privé ».  Pas parfait, mais ça tiendra…
const handler = server._onRequest.bind(server)

module.exports.handler = serverless(handler)
