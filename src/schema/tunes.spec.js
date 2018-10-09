import { ApolloServer } from 'apollo-server'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import connection from '../db/connection.js'
import schema from './index.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.json'

const REGEX_BSONID = /^[0-9a-f]{24}$/

describe('Tunes GraphQL schema', () => {
  const server = createTestServer()

  afterAll(() => connection.close())

  describe('Queries', () => {
    describe('allTunes', () => {
      beforeAll(async () => {
        await Tune.deleteMany({})
        await Tune.insertMany(TUNES)
      })

      it.todo('should order recent-first by default')

      it.todo('should honor sorting')
    })
  })
})

// Fonctions utilitaires internes
// ------------------------------

function createTestServer() {
  let user = null

  const server = new ApolloServer({
    ...schema,
    context: () => ({ user }),
    // schemaDirectives: { auth: auth.directive },
  })

  server.test = {
    logIn(...roles) {
      user = { roles }
    },
    logOut() {
      user = null
    },
  }

  return server
}

// Ce mini-utilitaire est juste là pour ne pas avoir à aller chercher la grappe
// résultante à chaque exécution GraphQL, dans le champ `data`.  En revanche, si
// une erreur survient, on ne verrait donc pas le champ `error`, présent au même
// niveau.
async function run({ server, query, mutation }) {
  const client = createTestClient(server)
  let result
  if (query) {
    result = await client.query({ query })
  } else {
    result = await client.mutate({ mutation })
  }

  if (result.errors) {
    throw result.errors[0]
  }

  return result.data
}
