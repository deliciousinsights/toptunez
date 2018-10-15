// Connexion MongoDB
// =================

import chalk from 'chalk-template'
import mongoose from 'mongoose'

// Chaîne URL de connexion
// -----------------------

const url =
  // Priorité absolue à la globale explicite (environnement de test dédié dans
  // JEST, plus important que la config éventuelle de dev / cloud).
  global.MONGODB_URI ||
  // Sinon, priorité à la variable d’environnement (dotenv éventuel en dev,
  // clouds / hébergeurs)
  process.env.MONGODB_URI ||
  // En dernier recours, donc sous-entendu en dev sans dotenv, base Mongo
  // locale, non-authentifiée, sur le port par défaut.
  'mongodb://localhost:27017/toptunez'

// Connexion automatique
// ---------------------
//
// Le simple fait de requérir ce module active la connexion, ce qui est
// notamment très pratique pour les tests, chaque modèle utilisant explicitement
// ce module. Le paramètre de *timeout* de connexion est ici spécifiquement calé
// pour le dev et les tests, mais ne pose pas de souci en production.
const connection = mongoose.createConnection(url, { connectTimeoutMS: 5000 })

// Logs de connexion / d’erreur
// ----------------------------

if (process.env.NODE_ENV !== 'test') {
  // Inutile de pourrir l’affichage des tests avec le log de connexion à la
  // base…
  connection.on('open', () => {
    console.log(
      chalk`{green ✅  Connected to mongoDB database ${connection.name}}`
    )
  })
}

// En revanche, loguer une erreur de connexion est utile dans tous les cas !
connection.on('error', () => {
  console.error(
    chalk`{red 🔥  Could not connect to mongoDB database ${connection.name}}`
  )
})

// Export par défaut du module : la connexion elle-même.
export default connection
