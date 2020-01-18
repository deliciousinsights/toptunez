import request from 'supertest'

import connection from '../db/connection.js'
import { createServer } from '../app.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.js'
import User from '../db/User.js'

const app = createServer()
const REGEX_BSON = /^[0-9a-f]{24}$/

describe('Tunes controller', () => {
  afterAll(() => connection.close())

  describe('Tune mutations', () => {
    let token

    beforeAll(async () => {
      token = (
        await User.signUp({
          email: 'john@smith.org',
          firstName: 'John',
          lastName: 'Smith',
          password: 'secret',
        })
      ).token
    })

    it('should allow tune creation', () => {
      return request(app)
        .post(app.router.render('createTune'))
        .set('Authorization', `JWT ${token}`)
        .send({ artist: 'Dash Berlin', title: 'World Falls Apart' })
        .expect(201)
        .expect('X-Tune-ID', REGEX_BSON)
    })

    it('should allow votes on a tune', async () => {
      const tune = await Tune.create({
        artist: 'Joachim Pastor',
        title: 'Kenia',
      })

      return request(app)
        .post(app.router.render('voteOnTune', { tuneId: tune.id }))
        .set('Authorization', `JWT ${token}`)
        .send({ offset: 1, comment: 'This track is dope!' })
        .expect(201)
        .expect('Cache-Control', 'no-cache, no-store, must-revalidate')
        .expect({ score: 1, voteCount: 1 })
    })
  })

  describe('Tune listings', () => {
    beforeAll(async () => {
      await Tune.deleteMany({})
      await Tune.insertMany(TUNES)
    })

    it('should order recent-first by default', () => {
      return request(app)
        .get(app.router.render('listTunes'))
        .expect(200)
        .then((res) => {
          expect(res.body.tunes).toMatchObject([
            { title: 'World Falls Apart' },
            { title: 'Kenia' },
            { title: 'Sky' },
          ])
        })
    })

    it('should retain recent-first ordering if not on v1.2+', () => {
      return request(app)
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
      const expectedLinks = {
        first: app.router.render('listTunes', {}, { page: 1, pageSize: 1 }),
        prev: app.router.render('listTunes', {}, { page: 2, pageSize: 1 }),
      }
      const expectedLinkHeader = Object.entries(expectedLinks)
        .map(([rel, url]) => `<${url}>; rel="${rel}"`)
        .join(', ')

      return request(app)
        .get(app.router.render('listTunes', {}, { page: 3, pageSize: 1 }))
        .expect(200)
        .expect('Link', expectedLinkHeader)
        .then((res) => {
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
