import errors from 'restify-errors'

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
