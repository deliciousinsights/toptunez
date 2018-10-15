// Tests d’intégration du contrôleur REST des morceaux
// ===================================================

import request from 'supertest'

import connection from '../db/connection.js'
import { createServer } from '../app.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.js'
import User from '../db/User.js'

const app = createServer()

// Un BSONID fait 12 octets, soit 24 caractères hexadécimaux
const REGEX_BSON = /^[0-9a-f]{24}$/

describe('Tunes controller', () => {
  // Penser à bien fermer la connexion MongoDB en fin de suite de test (de
  // process parallélisé Jest, donc), pour éviter que le jeu de tests ne rende
  // pas la main en raison du handle réseau resté ouvert.
  afterAll(() => connection.close())

  describe('Tune mutations', () => {
    // Les divers tests authentifiés auront besoin d’un JWT en cours de
    // validité : il est donc déclaré ici, dans leur *closure*.
    let token

    // Avant de lancer les tests de ce `describe()`, on crée un utilisateur dôté
    // du rôle admin (pour être autorisé à créer un morceau, notamment) et on
    // récupère son JWT.  Puisqu’il n’a pas de MFA actif, inutile de passer des
    // `X-TOTP-Tokens` au fil de l’eau.
    beforeAll(async () => {
      token = (
        await User.signUp({
          email: 'john@smith.org',
          firstName: 'John',
          lastName: 'Smith',
          password: 'secret',
          roles: ['admin'],
        })
      ).token
    })

    it('should allow tune creation', () => {
      // Avec supertest, on construit une requête, qui peut ne prendre qu’une
      // fonction serveur, auquel cas il créera automatiquement un serveur HTTP
      // autour le temps du test, sur un port libre, ce qui permet de
      // paralléliser des tests, chacun avec leur propre serveur HTTP, aisément.
      // Le surcoût en temps est négligeable.
      return (
        request(app)
          // On voit bien l‘intérêt DRY de la méthode `render()` du routeur.
          .post(app.router.render('createTune'))
          // On s’authentifie…
          .set('Authorization', `JWT ${token}`)
          // Et hop, les données du formulaire.  Filer un objet envoie
          // automatiquement une requête JSON.
          .send({ artist: 'Dash Berlin', title: 'World Falls Apart' })
          // On s’attend à un succès en code HTTP 201 (Created)…
          .expect(201)
          // …avec l’ID du morceau fraîchement créé dans l’en-tête de réponse
          // `X-Tune-ID` (nom qui nous est propre).
          .expect('X-Tune-ID', REGEX_BSON)
      )
    })

    it('should allow votes on a tune', async () => {
      // On s’assure d’avoir un morceau manipulable sous la main, déjà.
      const tune = await Tune.create({
        artist: 'Joachim Pastor',
        title: 'Kenia',
      })

      return (
        request(app)
          // Notez le deuxième argument de `render()`, qui fournit les
          // *params* : les segments dynamiques du chemin de l’URL.
          .post(app.router.render('voteOnTune', { tuneId: tune.id }))
          .set('Authorization', `JWT ${token}`)
          .send({ offset: 1, comment: 'This track is dope!' })
          .expect(201)
          .expect('Cache-Control', 'no-cache, no-store, must-revalidate')
          // Vérification de corps de réponse JSON (valeur exacte, pas de champ
          // complémentaire possible, contrairement à ce qu’on fera pour les
          // listings ; ordre des champs sans importance).
          .expect({ score: 1, voteCount: 1 })
      )
    })
  })

  describe('Tune listings', () => {
    // Avant de tester les listings, on réinitialise la collection avec quelques
    // morceaux qu’on maîtrise.
    beforeAll(async () => {
      await Tune.deleteMany({})
      await Tune.insertMany(TUNES)
    })

    it('should order recent-first by default', () => {
      return (
        request(app)
          .get(app.router.render('listTunes'))
          .expect(200)
          // Un requêteur Supertest étant une promesse, on peut parfaitement
          // chaîner un `then()` pour enquiller nos propres assertions maison
          // lorsque Supertest ne fournit pas ce qu’on veut.  Ici, pour faire un
          // test laxiste sur le corps de réponse.
          .then((res) => {
            // On passe ici au `expect()` global fourni par Jest, et à ses
            // [matchers](https://jestjs.io/docs/en/expect).  Le *matcher*
            // `toMatchObject()` est particulièrement sympa, puisqu’il fait une
            // comparaison profonde *partielle*, très utile ici.
            expect(res.body.tunes).toMatchObject([
              { title: 'World Falls Apart' },
              { title: 'Kenia' },
              { title: 'Sky' },
            ])
          })
      )
    })

    it('should retain recent-first ordering if not on v1.2+', () => {
      return (
        request(app)
          // Notez le 3e argument de `render()`, qui fournit les paramètres de
          // *query string* pour l’URL.
          .get(app.router.render('listTunes', {}, { sortBy: '-title' }))
          .set('Accept-Version', '1.0')
          .expect(200)
          .then(({ body: { tunes } }) => {
            expect(tunes).toMatchObject([
              { title: 'World Falls Apart' },
              { title: 'Kenia' },
              { title: 'Sky' },
            ])
          })
      )
    })

    it('should honor `sortBy` argument if on v1.2+', () => {
      return request(app)
        .get(app.router.render('listTunes', {}, { sortBy: '-title' }))
        .set('Accept-Version', '^1.2')
        .expect(200)
        .then(({ body: { tunes } }) => {
          expect(tunes).toMatchObject([
            { title: 'World Falls Apart' },
            { title: 'Sky' },
            { title: 'Kenia' },
          ])
        })
    })

    it('should provide links, even if empty', () => {
      return request(app)
        .get(app.router.render('listTunes'))
        .expect(200)
        .then(({ body: { links } }) => {
          expect(links).toEqual({})
        })
    })

    it('should provide earlier links when beyond page 1', () => {
      // On construit les liens attendus au format « objet », tels qu’ils
      // figureront dans le *payload* JSON de la réponse…
      const expectedLinks = {
        first: app.router.render('listTunes', {}, { page: 1, pageSize: 1 }),
        prev: app.router.render('listTunes', {}, { page: 2, pageSize: 1 }),
      }
      // …mais on construit aussi l’en-tête de réponse HTTP `Link:` équivalent,
      // puisque le contrôleur est censé peupler les deux, afin d’être aussi
      // *HATEOAS-compliant* que possible.
      const expectedLinkHeader = Object.entries(expectedLinks)
        .map(([rel, url]) => `<${url}>; rel="${rel}"`)
        .join(', ')

      return request(app)
        .get(app.router.render('listTunes', {}, { page: 3, pageSize: 1 }))
        .expect(200)
        .expect('Link', expectedLinkHeader)
        .then((res) => {
          // Notez la comparaison profonde stricte de `links`, avec le *matcher*
          // Jest `toEqual()` (profond par défaut).  On ne pouvait pas utiliser
          // le `.expect(obj)` de Supertest, car on ne vérifie ici qu’une partie
          // du corps de réponse.
          expect(res.body.links).toEqual(expectedLinks)
        })
    })

    it('should provide later links when before last page', () => {
      const expectedLinks = {
        last: app.router.render('listTunes', {}, { page: 3, pageSize: 1 }),
        next: app.router.render('listTunes', {}, { page: 2, pageSize: 1 }),
      }
      const expectedLinkHeader = Object.entries(expectedLinks)
        .map(([rel, url]) => `<${url}>; rel="${rel}"`)
        .join(', ')

      return request(app)
        .get(app.router.render('listTunes', {}, { page: 1, pageSize: 1 }))
        .expect(200)
        .expect('Link', expectedLinkHeader)
        .then((res) => {
          expect(res.body.links).toEqual(expectedLinks)
        })
    })
  })
})
