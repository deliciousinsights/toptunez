import errors from 'restify-errors'
import restify from 'restify'

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

async function createTune(req, res, next) {
  try {
    const { album, artist, title, url } = req.body
    const tune = await Tune.create({ album, artist, title, url })
    res.header('X-Tune-ID', tune.id)
    res.send(201)
    next()
  } catch (err) {
    next(err)
  }
}

async function listTunes(req, res, next) {
  try {
    const { filter, page, pageSize, sortBy } = req.query

    const searchArgs = { filter, page, pageSize }
    if (req.version() >= '1.2') {
      searchArgs.sorting = sortBy
    }
    const { links, tunes } = await Tune.search(searchArgs)

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
    const { tuneId } = req.params
    let tune = await Tune.findById(tuneId)

    if (!tune) {
      const err = new errors.UnprocessableEntityError(
        {
          info: { faultyId: tuneId },
        },
        'The tune you want to vote for cannot be found'
      )
      return next(err)
    }

    const { comment, offset } = req.body
    tune = await tune.vote({ comment, offset })
    res.noCache().send(201, { score: tune.score, voteCount: tune.votes.length })
    next()
  } catch (err) {
    next(err)
  }
}
