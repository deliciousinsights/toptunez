// Hooks globaux de test MongoDB pour Mocha
// ========================================
//
// Pour pouvoir réaliser des tests d’intégration (parallélisés qui plus est)
// dont le code testé recourt à une base MongoDB sans perdre notre santé
// mentale, nous utilisons le module `mongodb-memory-server`, qui nous fournit
// un serveur MongoDB récent 100% en mémoire, et activons via la configuration
// (clé `jest` du `package.json`) cet environnement de test sur-mesure, qui
// fournit une constante globale `MONGODB_URI` que notre fichier
// `src/db/connection.js` va utiliser de préférence à la base de dev locale.
//
// Chaque process de test en cours, pour chaque suite (fichier) de test, a sa
// propre instance en mémoire, ce qui évite toute pollution inter-fichiers.
// C’est en pratique très rapide (~20ms) !

import { MongoMemoryServer } from 'mongodb-memory-server'
import { connectToDB } from '../src/db/connection.js'

export const mochaHooks = {
  async beforeAll() {
    this._server = new MongoMemoryServer()
    this._connection = connectToDB(await this._server.getUri())
  },

  async afterAll() {
    await this._connection.close()
    return this._server.stop()
  },
}
