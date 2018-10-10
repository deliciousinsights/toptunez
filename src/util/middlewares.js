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

export function requireAuth({ role = null, roles = [] } = {}) {
  // Massage arguments
  role = String(role || '').trim()
  if (role && roles.length === 0) {
    roles = [role]
  }

  return function checkAuth(req, res, next) {
    if (!req.user) {
      return next(new errors.NotAuthorizedError())
    }

    const missingRoles = roles.filter((role) => !req.user.roles.includes(role))

    if (missingRoles.length > 0) {
      return next(
        new errors.NotAuthorizedError(
          `Missing required roles on the user: ${missingRoles.join(', ')}`
        )
      )
    }

    next()
  }
}
