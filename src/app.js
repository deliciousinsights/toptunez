import restify from 'restify'

import { setupTuneRoutes } from './controllers/tunes.js'

const APP_NAME = 'TopTunez'

export function createServer() {
  const server = restify.createServer({ name: APP_NAME })

  server.pre(restify.plugins.pre.dedupeSlashes())
  server.pre(restify.plugins.pre.sanitizePath())
  server.pre(restify.plugins.pre.strictQueryParams())
  server.pre(restify.plugins.pre.userAgentConnection())

  server.use(restify.plugins.queryParser({ mapParams: false }))
  server.use(restify.plugins.jsonBodyParser())

  setupTuneRoutes(server)

  return server
}
