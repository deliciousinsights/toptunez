import { expect } from 'chai'
import request from 'supertest'

import { createServer } from '../app.js'
import Tune from '../db/Tune.js'
import TUNES from '../../fixtures/tunes.json'
import User from '../db/User.js'

const app = createServer()
const REGEX_BSON = /^[0-9a-f]{24}$/

describe('Tunes controller', () => {
  describe('Tune mutations', () => {
    let token

    before(async () => {
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
    before(async () => {
      await Tune.deleteMany({})
      await Tune.insertMany(TUNES)
    })

    it('should order recent-first by default', () => {
      return request(app)
        .get(app.router.render('listTunes'))
        .expect(200)
        .then((res) => {
          const titles = res.body.tunes.map(({ title }) => title)
          expect(titles).to.deep.equal(['World Falls Apart', 'Kenia', 'Sky'])
        })
    })

    it('should retain recent-first ordering if not on v1.2+', () => {
      return request(app)
        .get(app.router.render('listTunes', {}, { sortBy: '-title' }))
        .expect(200)
        .then((res) => {
          const titles = res.body.tunes.map(({ title }) => title)
          expect(titles).to.deep.equal(['World Falls Apart', 'Kenia', 'Sky'])
        })
    })

    it('should honor `sortBy` argument if on v1.2+', () => {
      return request(app)
        .get(app.router.render('listTunes', {}, { sortBy: '-title' }))
        .set('Accept-Version', '^1.2')
        .expect(200)
        .then((res) => {
          const titles = res.body.tunes.map(({ title }) => title)
          expect(titles).to.deep.equal(['World Falls Apart', 'Sky', 'Kenia'])
        })
    })

    it('should provide links, even if empty', () => {
      return request(app)
        .get(app.router.render('listTunes'))
        .expect(200)
        .then(({ body: { links } }) => {
          expect(links).to.deep.equal({})
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
          expect(res.body.links).to.deep.equal(expectedLinks)
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
          expect(res.body.links).to.deep.equal(expectedLinks)
        })
    })
  })
})
