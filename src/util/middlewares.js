import { config as configEnv } from 'dotenv-safe'
import errors from 'restify-errors'
import jwtMiddleware from 'restify-jwt-community'

configEnv()

export function jwt() {
  return jwtMiddleware({
    credentialsRequired: false,
    secret: process.env.JWT_SECRET,
  })
}

export function requireAuth() {
  return function checkAuth(req, res, next) {
    if (!req.user) {
      return next(new errors.NotAuthorizedError())
    }

    next()
  }
}
