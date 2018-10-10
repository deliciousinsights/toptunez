import errors from 'restify-errors'
import restify from 'restify'
import restifyValidation from 'node-restify-validation'

import { cors, hsts, jwt, totpCheck } from './util/middlewares.js'
import { setupTuneRoutes } from './controllers/tunes.js'
import { setupUserRoutes } from './controllers/users.js'

import './util/expose-restify-route-expandos.js'

const APP_NAME = 'TopTunez'

export function createServer() {
  const corsMW = cors()
  const server = restify.createServer({ name: APP_NAME })

  server.pre(restify.plugins.pre.dedupeSlashes())
  server.pre(restify.plugins.pre.sanitizePath())
  server.pre(restify.plugins.pre.strictQueryParams())
  server.pre(restify.plugins.pre.userAgentConnection())

  server.pre(corsMW.preflight)
  server.pre(jwt())
  server.pre(totpCheck())

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

  server.use(restify.plugins.acceptParser(server.acceptable))
  server.use(restify.plugins.queryParser({ mapParams: false }))
  server.use(restify.plugins.jsonBodyParser())
  server.use(hsts())
  server.use(corsMW.actual)

  server.use(
    restifyValidation.validationPlugin({
      forbidUndefinedVariables: true,
      errorHandler: errors.BadRequestError,
      validatorModels: restifyValidation.validatorModels,
    })
  )

  setupTuneRoutes(server)
  setupUserRoutes(server)

  return server
}
