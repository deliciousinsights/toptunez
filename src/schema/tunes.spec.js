import { ApolloServer } from '@apollo/server'
import gql from 'graphql-tag'

import attrs from '../../fixtures/tune.json'
import { buildSchema } from './index.js'
import connection from '../db/connection.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.js'

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

  describe('Mutations', () => {
    describe('createTune', () => {
      it('should allow tune creation', async () => {
        const input = Object.entries(attrs)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ')

        const { createTune } = await run(gql`
            mutation {
              createTune(input: { ${input} }) {
                id
                album
                artist
                title
                score
                url
              }
            }
          `)

        expect(createTune).toEqual({
          ...attrs,
          score: 0,
          id: expect.stringMatching(REGEX_BSONID),
        })
      })
    })

    describe('voteOnTune', () => {
      it('should allow votes on a tune', async () => {
        const tune = await Tune.create({
          artist: 'Joachim Pastor',
          title: 'Kenia',
        })

        const { voteOnTune } = await run(gql`
            mutation {
              voteOnTune(input: { tuneID: "${tune.id}", direction: UPVOTE, comment: "This track is dope!" }) {
                tune {
                  score
                }
                vote {
                  comment
                  direction
                }
              }
            }
          `)

        expect(voteOnTune).toMatchObject({
          vote: { comment: 'This track is dope!', direction: 'UPVOTE' },
          tune: { score: 1 },
        })
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
