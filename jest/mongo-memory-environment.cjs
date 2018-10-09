const MongoDBMemoryServer = require('mongodb-memory-server').default
const NodeEnvironment = require('jest-environment-node')

class MongoMemoryEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup()
    this._server = new MongoDBMemoryServer()
    this.global.MONGODB_URI = await this._server.getUri()
  }

  async teardown() {
    await this._server.stop()
    await super.teardown()
  }
}

module.exports = MongoMemoryEnvironment
