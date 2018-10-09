import restify from 'restify'
import semver from 'semver'

import Tune from '../db/Tune.js'

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

async function createTune(req, res) {
  const { album, artist, title, url } = req.body
  const tune = await Tune.create({ album, artist, title, url })
  res.header('X-Tune-ID', tune.id)
  res.send(201)
}

async function listTunes(req, res) {
  const { filter, page, pageSize, sortBy } = req.query

  const searchArgs = { filter, page, pageSize }
  if (semver.gte(res.header('api-version'), '1.2.0')) {
    searchArgs.sorting = sortBy
  }
  const { links, tunes } = await Tune.search(searchArgs)

  for (const [rel, query] of Object.entries(links)) {
    const url = router.render('listTunes', {}, query)
    links[rel] = url
    res.link(url, rel)
  }

  res.send({ links, tunes })
}

async function voteOnTune(req, res) {
  res.send(201, { score: 1, voteCount: 1 })
}
