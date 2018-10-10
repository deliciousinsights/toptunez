import { config as configEnv } from 'dotenv-safe'
import corsMiddleware from 'restify-cors-middleware'
import errors from 'restify-errors'
import jwtMiddleware from 'restify-jwt-community'

import User from '../db/User.js'

configEnv()

export const DEFAULT_CORS_OPTIONS = {
  allowHeaders: ['authorization', 'x-totp-token'],
  exposeHeaders: ['authorization', 'x-totp-token'],
  origins: [
    /^https?:\/\/localhost(?::\d+)?$/,
    /^https?:\/\/(?:[\w.-]+\.)?delicious-insights.com$/,
    'https://toptunez.test',
    'https://toptunez-graphql.test',
  ],
  preflightMaxAge: 5,
}

export function cors({
  allowHeaders = DEFAULT_CORS_OPTIONS.allowHeaders,
  exposeHeaders = DEFAULT_CORS_OPTIONS.exposeHeaders,
  origins = DEFAULT_CORS_OPTIONS.origins,
  preflightMaxAge = DEFAULT_CORS_OPTIONS.preflightMaxAge,
} = {}) {
  return corsMiddleware({
    allowHeaders,
    exposeHeaders,
    origins,
    preflightMaxAge,
  })
}

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

export function totpCheck({ totpHeader = 'X-TOTP-Token' } = {}) {
  return async function checkTOTP(req, res, next) {
    if (!req.user) {
      return next()
    }

    const token =
      req.headers[totpHeader] || req.headers[totpHeader.toLowerCase()]
    try {
      const error = await User.checkMFA({ email: req.user.email, token })
      next(error ? new errors.InvalidCredentialsError(error.message) : null)
    } catch (err) {
      next(err)
    }
  }
}
