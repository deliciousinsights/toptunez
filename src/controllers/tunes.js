import errors from 'restify-errors'
import restify from 'restify'
import semver from 'semver'

import { requireAuth } from '../util/middlewares.js'
import Tune from '../db/Tune.js'

const TESTING = process.env.NODE_ENV === 'test'
let router

export function setupTuneRoutes(server) {
  router = server.router

  server.get(
    {
      name: 'listTunes',
      path: '/tunes',
      validation: {
        queries: {
          filter: { isRequired: false },
          page: { isInt: true, isRequired: false, min: 1 },
          pageSize: {
            isDivisibleBy: TESTING ? 1 : 10,
            isInt: true,
            isRequired: false,
            min: TESTING ? 1 : 10,
            max: 100,
          },
          sortBy: {
            // Note : `flatMap` est ES2019, dispo depuis Node 11 (2018).
            isIn: ['album', 'artist', 'createdAt', 'score', 'title'].flatMap(
              (field) => [field, `-${field}`]
            ),
            isRequired: false,
          },
        },
      },
    },
    restify.plugins.conditionalHandler([
      { version: '1.0.0', handler: listTunes },
      { version: '1.2.0', handler: listTunes },
    ])
  )
  server.post(
    {
      name: 'createTune',
      path: '/tunes',
      validation: {
        content: {
          album: { isRequired: false },
          artist: { isRequired: true },
          title: { isRequired: true },
          url: { isRequired: false, isURL: true },
        },
      },
    },
    requireAuth({ role: 'admin' }),
    createTune
  )
  server.post(
    {
      name: 'voteOnTune',
      path: '/tunes/:tuneId/votes',
      validation: {
        content: {
          comment: { isRequired: false },
          offset: { isInt: true, isIn: [-1, 1] },
        },
        resources: {
          tuneId: { isRequired: true, isMongoId: true },
        },
      },
    },
    requireAuth(),
    voteOnTune
  )
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
  const { tuneId } = req.params
  let tune = await Tune.findById(tuneId)

  if (!tune) {
    return new errors.ResourceNotFoundError(
      {
        info: { faultyId: tuneId },
      },
      'The tune you want to vote for cannot be found'
    )
  }

  const { comment, offset } = req.body
  tune = await tune.vote({ comment, offset })
  res.noCache().send(201, { score: tune.score, voteCount: tune.votes.length })
}
