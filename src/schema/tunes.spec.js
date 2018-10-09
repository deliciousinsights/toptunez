import { ApolloServer } from '@apollo/server'
import gql from 'graphql-tag'

import { buildSchema } from './index.js'
import connection from '../db/connection.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.js'

describe('Tunes GraphQL schema', () => {
  const server = createTestServer()

  afterAll(() => connection.close())

  describe('Queries', () => {
    describe('allTunes', () => {
      beforeAll(async () => {
        await Tune.deleteMany({})
        await Tune.insertMany(TUNES)
      })

      it('should order recent-first by default', async () => {
        const { allTunes } = await run(gql`
          {
            allTunes {
              title
            }
          }
        `)

        expect(allTunes).toEqual([
          { title: 'World Falls Apart' },
          { title: 'Kenia' },
          { title: 'Sky' },
        ])
      })

      it('should honor sorting', async () => {
        const { allTunes } = await run(gql`
          {
            allTunes(sorting: SCORE_DESC) {
              title
            }
          }
        `)

        expect(allTunes).toEqual([
          { title: 'World Falls Apart' },
          { title: 'Sky' },
          { title: 'Kenia' },
        ])
      })
    })
  })

  // Fonctions internes utilitaires
  // ------------------------------

  function createTestServer() {
    return new ApolloServer({ schema: buildSchema() })
  }

  // Ce mini-utilitaire est juste là pour ne pas avoir à aller chercher la grappe
  // résultante à chaque exécution GraphQL, dans le champ `data`.  En revanche, si
  // une erreur survient, on ne verrait donc pas le champ `error`, présent au même
  // niveau.
  async function run(query) {
    const {
      body: { singleResult: result },
    } = await server.executeOperation({ query })

    if (result.errors) {
      throw new Error(result.errors[0].message)
    }

    return result.data
  }
})
