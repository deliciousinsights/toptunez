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

async function logIn(req, res, next) {
  try {
    const { user } = await User.logIn(req.body)
    if (user) {
      res.send({ user })
      next()
    } else {
      next(new errors.InvalidCredentialsError())
    }
  } catch (err) {
    next(err)
  }
}

async function signUp(req, res, next) {
  try {
    const { user } = await User.signUp(req.body)
    res.send(201, { user })
    next()
  } catch (err) {
    next(err)
  }
}
