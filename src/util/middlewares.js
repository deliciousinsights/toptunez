// Middlewares REST pour les aspects sécuritaires
// ==============================================

import { config as configEnv } from 'dotenv-safe'
import corsMiddleware from 'restify-cors-middleware2'
import errors from 'restify-errors'
import jwtMiddleware from 'restify-jwt-community'
import ms from 'ms'

import User from '../db/User.js'

// Vu qu’on a besoin de certaines variables d’environnement, pour le dev et les
// tests on s’assure que `dotenv-safe` les a récupérées et mises en place dans
// `process.env`.
configEnv()

// Options CORS par défaut
// -----------------------
//
// Notre middleware s’en sert pour Restify, mais pour GraphQL, Apollo aura
// besoin des options elles-mêmes, qui d’ailleurs n’auront pas tout-à-fait le
// même nom, donc on les exportera à part (voir le `module.exports` plus loin).
//
// Pour plus de détails sur la sémantique des différentes options, consultez [la
// spec des en-têtes](https://www.w3.org/TR/cors/#syntax) dans le standard W3C
// pour CORS.
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

// Middleware CORS pour Restify
// ----------------------------
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

// Middleware HSTS pour Restify
// ----------------------------
//
// [Plus d’infos sur
// HSTS](https://developer.mozilla.org/fr/docs/S%C3%A9curit%C3%A9/HTTP_Strict_Transport_Security)

// On valide l’exigence HTTS pour un an par défaut
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

// Middlewares d’authentification JWT pour Restify
// -----------------------------------------------

// Décodage et vérification de signature numérique de tokens existants.
export function jwt() {
  return jwtMiddleware({
    // Toujours préciser la liste d'algorithmes autorisés, notamment pour
    // échapper à 'NONE'.
    algorithms: ['HS256'],
    // On n’exige pas l’authentification à ce niveau : c’est ensuite, route par
    // route, qu’on le précisera.  Ici, on décode et on vérifie juste l’éventuel
    // token.
    credentialsRequired: false,
    // Le secret utilisé pour signer numériquement les tokens (au sein du modèle
    // `User`, du coup).
    secret: process.env.JWT_SECRET,
  })
}

// Exigence d’authentification, voire de rôles sur l’utilisateur authentifié.
//
// Ce middleware va être incrusté dans les chaînes de gestionnaires de nos
// routes, au cas par cas, en amon tdu gestionnaire final afin de pouvoir le cas
// échéant interdire l’accès.
//
// Comme on aime les APIs agréables à lire, suivant qu’on exige un ou plusieurs
// rôles, on pourra utiliser `role` ou `roles` : on normalise en interne.  On
// peut aussi ne rien passer du tout : la valeur par défaut sur la droite (`=
// {}`) évite un souci à la déstructuration.
export function requireAuth({ role = null, roles = [] } = {}) {
  // « Massage » des arguments pour avoir un `roles` *in fine*
  role = String(role || '').trim()
  if (role && roles.length === 0) {
    roles = [role]
  }

  // Le middleware proprement dit, qui consultera les éventuelles exigences de
  // rôles dans sa *closure*.
  return function checkAuth(req, res, next) {
    // Pas de user ? BLAM !
    if (!req.user) {
      return next(new errors.NotAuthorizedError())
    }

    // Manque-t-il des rôles parmi ceux exigés ?
    const missingRoles = roles.filter((role) => !req.user.roles.includes(role))

    // Si oui, BLAM, mais en précisant quand même les rôles manquants, histoire
    // d’être sympa.
    if (missingRoles.length > 0) {
      return next(
        new errors.NotAuthorizedError(
          `Missing required roles on the user: ${missingRoles.join(', ')}`
        )
      )
    }

    // On est toujours là ? Tout roule alors !
    next()
  }
}

// Middleware de vérification MFA / TOTP
// -------------------------------------

// Si un utilisateur est présent, on extrait l’éventuel 2e facteur
// d’authentification, qu’on attend dans l’en-tête de requête HTTP
// `X-TOTP-Token` (par défaut, c’est modifiable), et on passe le tout pour
// vérification.  En pratique, si l’utilisateur n’exige pas MFA, on se fout du
// TOTP, présent ou non. Dans le cas contraire, on vérifie sa validité
// immédiate.
export function totpCheck({ totpHeader = 'X-TOTP-Token' } = {}) {
  return async function checkTOTP(req, res) {
    if (!req.user) {
      return
    }

    const token =
      req.headers[totpHeader] || req.headers[totpHeader.toLowerCase()]
    // En cas de souci, `check` sera un objet erreur Restify, sinon `null`, ce
    // qui ira très bien à `next()` dans les deux cas.
    const error = await User.checkMFA({ email: req.user.email, token })
    return error ? new errors.InvalidCredentialsError(error.message) : null
  }
}
