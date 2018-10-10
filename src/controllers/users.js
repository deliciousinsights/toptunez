import errors from 'restify-errors'

import { requireAuth } from '../util/middlewares.js'
import User from '../db/User.js'

export function setupUserRoutes(server) {
  server.post(
    {
      name: 'signUp',
      path: '/users',
      validation: {
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
    requireAuth(),
    toggleMFA
  )
}

async function logIn(req, res) {
  const { token } = await User.logIn(req.body)
  if (token) {
    res.send({ token })
  } else {
    return new errors.InvalidCredentialsError()
  }
}

async function signUp(req, res) {
  const { token } = await User.signUp(req.body)
  res.send(201, { token })
}

async function toggleMFA(req, res) {
  const user = await User.findOne({ email: req.user.email })
  res.send(await user.toggleMFA(req.body.enabled))
}
