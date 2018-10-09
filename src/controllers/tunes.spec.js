import request from 'supertest'

import connection from '../db/connection.js'
import { createServer } from '../app.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.js'

const app = createServer()
const REGEX_BSON = /^[0-9a-f]{24}$/

describe('Tunes controller', () => {
  afterAll(() => connection.close())

  describe('Tune mutations', () => {
    it('should allow tune creation', () => {
      return request(app)
        .post(app.router.render('createTune'))
        .send({ artist: 'Dash Berlin', title: 'World Falls Apart' })
        .expect(201)
        .expect('X-Tune-ID', REGEX_BSON)
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
