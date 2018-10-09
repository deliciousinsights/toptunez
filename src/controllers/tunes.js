import restify from 'restify'

import { getPageDescriptors } from '../util/pagination.js'
import TUNES from '../../fixtures/tunes.json'

let router

export function setupTuneRoutes(server) {
  router = server.router

  server.get(
    { name: 'listTunes', path: '/tunes' },
    restify.plugins.conditionalHandler([
      { version: '1.0.0', handler: listTunes },
      { version: '1.2.0', handler: listTunes },
    ])
  )
  server.post({ name: 'createTune', path: '/tunes' }, createTune)
  server.post({ name: 'voteOnTune', path: '/tunes/:tuneId/votes' }, voteOnTune)
}

async function createTune(req, res, next) {
  try {
    res.header('X-Tune-ID', 42)
    res.send(201)
    next()
  } catch (err) {
    next(err)
  }
}

async function listTunes(req, res, next) {
  try {
    const { page = 1, pageSize = 10, sortBy = 'createdAt' } = req.query

    const links = getPageDescriptors({
      page,
      pageSize,
      totalCount: TUNES.length,
    })
    const field = req.version() >= '1.2' ? sortBy : 'createdAt'
    const tunes = [...TUNES]
      .sort((t1, t2) => t2[field].localeCompare(t1[field]))
      .slice((page - 1) * pageSize, page * pageSize)

    for (const [rel, query] of Object.entries(links)) {
      const url = router.render('listTunes', {}, query)
      links[rel] = url
      res.link(url, rel)
    }

    res.send({ links, tunes })
    next()
  } catch (err) {
    next(err)
  }
}

async function voteOnTune(req, res, next) {
  try {
    res.send(201, { score: 1, voteCount: 1 })
    next()
  } catch (err) {
    next(err)
  }
}
