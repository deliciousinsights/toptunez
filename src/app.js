import errors from 'restify-errors'
import restify from 'restify'
import restifyValidation from 'node-restify-validation'

import { setupTuneRoutes } from './controllers/tunes.js'

import './util/expose-restify-route-expandos.js'

const APP_NAME = 'TopTunez'

export function createServer() {
  const server = restify.createServer({ name: APP_NAME })

  server.pre(restify.plugins.pre.dedupeSlashes())
  server.pre(restify.plugins.pre.sanitizePath())
  server.pre(restify.plugins.pre.strictQueryParams())
  server.pre(restify.plugins.pre.userAgentConnection())

  server.use(restify.plugins.acceptParser(server.acceptable))
  server.use(restify.plugins.queryParser({ mapParams: false }))
  server.use(restify.plugins.jsonBodyParser())

  server.use(
    restifyValidation.validationPlugin({
      forbidUndefinedVariables: true,
      errorHandler: errors.BadRequestError,
      validatorModels: restifyValidation.validatorModels,
    })
  )

  setupTuneRoutes(server)

  return server
}
