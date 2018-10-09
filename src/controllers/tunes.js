import { getPageDescriptors } from '../util/pagination.js'
import TUNES from '../../fixtures/tunes.js'

let router

export function setupTuneRoutes(server) {
  router = server.router

  server.get({ name: 'listTunes', path: '/tunes' }, listTunes)
  server.post({ name: 'createTune', path: '/tunes' }, createTune)
  server.post({ name: 'voteOnTune', path: '/tunes/:tuneId/votes' }, voteOnTune)
}

async function createTune(req, res) {
  res.header('X-Tune-ID', 42)
  res.send(201)
}

async function listTunes(req, res) {
  const { page = 1, pageSize = 10 } = req.query

  const links = getPageDescriptors({
    page,
    pageSize,
    totalCount: TUNES.length,
  })
  const tunes = [...TUNES]
    .sort((t1, t2) => t2.createdAt.localeCompare(t1.createdAt))
    .slice((page - 1) * pageSize, page * pageSize)

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
