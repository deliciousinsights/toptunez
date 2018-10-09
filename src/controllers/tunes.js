import TUNES from '../../fixtures/tunes.json'

export function setupTuneRoutes(server) {
  server.get('/tunes', listTunes)
  server.post('/tunes', createTune)
  server.post('/tunes/:tuneId/votes', voteOnTune)
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
    res.send({ tunes: [{ artist: 'Alan Walker', title: 'Sky' }] })
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
