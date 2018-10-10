import { config as configEnv } from 'dotenv-safe'
import corsMiddleware from 'restify-cors-middleware2'
import errors from 'restify-errors'
import jwtMiddleware from 'restify-jwt-community'
import ms from 'ms'

configEnv()

export const DEFAULT_CORS_OPTIONS = {
  allowedHeaders: ['authorization', 'x-totp-token', 'content-type'],
  exposedHeaders: ['api-version'],
  origin: [
    /^https?:\/\/(?:[\w.-]+\.)?delicious-insights.com$/,
    'https://studio.apollographql.com',
  ],
  maxAge: ms('1 day'),
}

if (process.env.NODE_ENV !== 'production') {
  DEFAULT_CORS_OPTIONS.origin.push(/^https?:\/\/localhost(?::\d+)?$/)
}

export function cors({
  allowHeaders = DEFAULT_CORS_OPTIONS.allowedHeaders,
  exposeHeaders = DEFAULT_CORS_OPTIONS.exposedHeaders,
  origins = DEFAULT_CORS_OPTIONS.origin,
  preflightMaxAge = DEFAULT_CORS_OPTIONS.maxAge,
} = {}) {
  return corsMiddleware({
    allowHeaders,
    exposeHeaders,
    origins,
    preflightMaxAge,
  })
}

const ONE_YEAR = 365 * 24 * 60 * 60

export function apolloHSTS(maxAge = ONE_YEAR) {
  return {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          requestContext.response.http.headers.set(
            'Strict-Transport-Security',
            `max-age=${maxAge}; includeSubDomains`
          )
        },
      }
    },
  }
}

export function hsts(maxAge = ONE_YEAR) {
  return function hsts(req, res, next) {
    res.header(
      'Strict-Transport-Security',
      `max-age=${maxAge}; includeSubDomains`
    )
    next()
  }
}

export function jwt() {
  return jwtMiddleware({
    algorithms: ['HS256'],
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
