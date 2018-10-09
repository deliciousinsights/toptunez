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
