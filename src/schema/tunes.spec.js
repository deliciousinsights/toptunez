// Tests d’intégration du contrôleur GraphQL des morceaux
// ======================================================
import { ApolloServer } from '@apollo/server'
import gql from 'graphql-tag'

import attrs from '../../fixtures/tune.json'
import { buildSchema } from './index.js'
import connection from '../db/connection.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.js'

// Un BSONID fait 12 octets, soit 24 caractères hexadécimaux.  Des doutes sur
// les expressions rationnelles ? [Jetez donc un œil par
// ici](https://regex101.com).
const REGEX_BSONID = /^[0-9a-f]{24}$/

describe('Tunes GraphQL schema', () => {
  const server = createTestServer()

  // Penser à bien fermer la connexion MongoDB en fin de suite de test (de
  // process parallélisé Jest, donc), pour éviter que le jeu de tests ne rende
  // pas la main en raison du handle réseau resté ouvert.
  afterAll(() => connection.close())

  // Tests des *queries*
  // -------------------

  describe('Queries', () => {
    describe('allTunes', () => {
      // Avant de tester les listings, on réinitialise la collection avec
      // quelques morceaux qu’on maîtrise.
      beforeAll(async () => {
        await Tune.deleteMany({})
        await Tune.insertMany(TUNES)
      })

      it('should order recent-first by default', async () => {
        // On s’est fait un minuscule utilitaire appelé `run()`, que vous verrez
        // plus bas, qui exécute juste la requête GraphQL et en extrait la
        // grappe résultat (champ `data`, parallèle à un éventuel champ `error`
        // qu’on ne consulte pas).
        //
        // Pratique : on lui file directement le texte SDL, sous forme de
        // `String`.
        const { allTunes } = await run(gql`
          {
            allTunes {
              title
            }
          }
        `)

        // On utilise ici le `expect()` global fourni par Jest, et ses
        // [matchers](https://jestjs.io/docs/en/expect).  Le *matcher*
        // `toEqual()` fait une comparaison profonde *exacte*, mais comme on est
        // sur une grappe partielle garantie par GraphQL, c’est justement très
        // adapté, on vérifie au passage que rien ne dépasse…
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
      // Par souci de DRY, on construit dynamiquement une représentation
      // GraphQL du `TuneInput` basé sur l’objet exporté par la *fixture*
      // importée.  Par exemple, `{ foo: 'pouet', bar: 'baz' }` donnerait
      // `foo: "pouet", bar: "baz"`
      const input = Object.entries(attrs)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ')

      const query = gql`
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
      `

      it('should require authentication', () => {
        return expect(run(query)).rejects.toThrow(
          'createTune requires authentication'
        )
      })

      it('should require admin privileges', () => {
        return expect(run(query, { roles: [] })).rejects.toThrow(
          /createTune requires .* admin/
        )
      })

      it('should allow tune creation', async () => {
        const { createTune } = await run(query, { roles: ['admin'] })

        expect(createTune).toEqual({
          ...attrs,
          score: 0,
          id: expect.stringMatching(REGEX_BSONID),
        })
      })
    })

    describe('voteOnTune', () => {
      let tune, query

      beforeAll(async () => {
        tune = await Tune.create({
          artist: 'Joachim Pastor',
          title: 'Kenia',
        })

        query = gql`
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
          `
      })

      it('should require authentication', () => {
        return expect(run(query)).rejects.toThrow(
          'voteOnTune requires authentication'
        )
      })

      it('should allow votes on a tune', async () => {
        const { voteOnTune } = await run(query, { roles: [] })

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
  async function run(query, user = null) {
    const {
      body: { singleResult: result },
    } = await server.executeOperation({ query }, { contextValue: { user } })

    if (result.errors) {
      throw new Error(result.errors[0].message)
    }

    return result.data
  }
})
