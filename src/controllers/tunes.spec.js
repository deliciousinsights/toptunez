import { expect } from 'chai'
import request from 'supertest'

import { createServer } from '../app.js'

const app = createServer()

describe('Tunes controller', () => {
  describe('Tune listings', () => {
    it('should order recent-first by default', () => {
      return request(app)
        .get(app.router.render('listTunes'))
        .expect(200)
        .then((res) => {
          const titles = res.body.tunes.map(({ title }) => title)
          expect(titles).to.deep.equal(['World Falls Apart', 'Kenia', 'Sky'])
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
