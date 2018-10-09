// Environnement de test MongoDB pour Jest
// =======================================
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

const { MongoMemoryServer } = require('mongodb-memory-server')
const NodeEnvironment = require('jest-environment-node').default

class MongoMemoryEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup()
    this._server = await MongoMemoryServer.create()
    this.global.MONGODB_URI = this._server.getUri()
  }

  async teardown() {
    await this._server.stop()
    await super.teardown()
  }
}

module.exports = MongoMemoryEnvironment
