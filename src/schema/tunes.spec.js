// Tests d’intégration du contrôleur GraphQL des morceaux
// ======================================================

import { ApolloServer } from 'apollo-server'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import attrs from '../../fixtures/tune.json'
import { auth } from '../util/graphql-jwt.js'
import connection from '../db/connection.js'
import schema from './index.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.json'

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
        // `String`.  En revanche, on ne peut pas utiliser le *tagger* `gql`
        // d’Apollo, qui produit un descripteur Apollo de schéma au lieu de
        // laisser la String tranquille : on a donc fait le nôtre (voir plus bas
        // aussi).
        //
        // *(Pourquoi utiliser un tagger alors, au lieu de la chaîne simple ?
        // Pour bénéficier de la coloration syntaxique et du formatage
        // automatique dans VSCode, tiens !)*

        const { allTunes } = await run({
          server,
          query: gql`
            {
              allTunes {
                title
              }
            }
          `,
        })

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
        const { allTunes } = await run({
          server,
          query: gql`
            {
              allTunes(sorting: SCORE_DESC) {
                title
              }
            }
          `,
        })
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

      const mutation = gql`
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
        server.test.logOut()
        return expect(run({ server, mutation })).rejects.toThrow(
          'createTune requires authentication'
        )
      })

      it('should require admin privileges', () => {
        server.test.logIn()
        return expect(run({ server, mutation })).rejects.toThrow(
          /createTune requires .* ADMIN/
        )
      })

      it('should allow tune creation', async () => {
        server.test.logIn('admin')
        const { createTune } = await run({ server, mutation })

        // L’*object spread* ci-dessous (ES2018, Node 8.6+) est là pour vérifier
        // que `createTune` a bien initialisé certains champs, comme `score` à
        // zéro.
        expect(createTune).toMatchObject({ ...attrs, score: 0 })
        expect(createTune.id).toMatch(REGEX_BSONID)
      })
    })

    describe('voteOnTune', () => {
      let tune, mutation

      beforeAll(async () => {
        tune = await Tune.create({
          artist: 'Joachim Pastor',
          title: 'Kenia',
        })

        mutation = gql`
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
        server.test.logOut()

        return expect(run({ server, mutation })).rejects.toThrow(
          'voteOnTune requires authentication'
        )
      })

      it('should allow votes on a tune', async () => {
        server.test.logIn()
        const { voteOnTune } = await run({ server, mutation })

        expect(voteOnTune).toMatchObject({
          vote: { comment: 'This track is dope!', direction: 'UPVOTE' },
          tune: { score: 1 },
        })
      })
    })
  })
})

// Fonctions internes utilitaires
// ------------------------------

function createTestServer() {
  let user = null

  const server = new ApolloServer({
    ...schema,
    context: () => ({ user }),
    schemaDirectives: { auth: auth.directive },
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
