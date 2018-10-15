// Contrôleur REST des morceaux
// ============================

import errors from 'restify-errors'

import { requireAuth } from '../util/middlewares.js'
import User from '../db/User.js'

// Configuration des routes
// ------------------------

// Cette fonction, l‘export par défaut du module, configure nos routes d’API
// REST sur le serveur Restify fourni. Elle est appelée depuis la configuration
// applicative de `src/app.js`
export function setupUserRoutes(server) {
  // Route : inscription au service
  server.post(
    {
      // Nommer nos routes nous permet par la suite, grâce au routeur et à sa
      // méthode `render()`, de reconstituer nos URLs automatiquement.
      name: 'signUp',
      path: '/users',
      validation: {
        // Validation du corps de requête
        content: {
          email: { isEmail: true, isRequired: true },
          firstName: { isRequired: true },
          lastName: { isRequired: true },
          password: { isRequired: true },
        },
      },
    },
    signUp
  )

  // Route : connexion au service (utilisateur existant)
  server.post(
    {
      name: 'logIn',
      path: '/sessions',
      validation: {
        content: {
          email: { isEmail: true, isRequired: true },
          password: { isRequired: true },
        },
      },
    },
    logIn
  )

  // Route : bascule d’activation du MFA (utilisateur courant)
  server.patch(
    {
      name: 'toggleMFA',
      path: '/users/me/mfa',
      validation: {
        content: {
          enabled: { isBoolean: true, isRequired: true },
        },
      },
    },
    // Middleware à nous exigeant un utilisateur authentifié.
    requireAuth(),
    // Le gestionnaire à proprement parler arrive en dernier argument.
    toggleMFA
  )
}

// Gestionnaires de routes
// -----------------------

// Gestionnaire de route : connexion
async function logIn(req, res) {
  // Puisqu’on a une validation de requête en amont, qui interdit notamment
  // les champs non explicitement définis, on ne risque pas d’avoir un
  // `req.body` dangereux / subversif ; il a exactement la structure de
  // l’argument de `logIn` on peut donc le passer directement.
  const { token } = await User.logIn(req.body)
  if (token) {
    // On renvoie le JWT pour cet utilisateur en cas de connexion réussie.  Il
    // permettra par la suite l’authentification au sein de l’en-tête de
    // requête `Authorization`.
    res.send({ token })
  } else {
    return new errors.InvalidCredentialsError()
  }
}

// Gestionnaire de route : inscription
async function signUp(req, res) {
  // Puisqu’on a une validation de requête en amont, qui interdit notamment
  // les champs non explicitement définis, on ne risque pas d’avoir un
  // `req.body` dangereux / subversif ; il a exactement la structure de
  // l’argument de `signUp` on peut donc le passer directement.
  const { token } = await User.signUp(req.body)
  res.send(201, { token })
}

// Gestionnaire de route : bascule d’activation du MFA
async function toggleMFA(req, res) {
  const user = await User.findOne({ email: req.user.email })
  // La méthode métier renvoie le nouvel état actif (`enabled`), et si
  // activation, une Data-URL pour le QR Code de configuration d’une app
  // authentificatrice tierce, type [Authy](https://authy.com/).
  res.send(await user.toggleMFA(req.body.enabled))
}
