export function setupTuneRoutes(server) {
  server.get('/tunes', listTunes)
  server.post('/tunes', createTune)
  server.post('/tunes/:tuneId/votes', voteOnTune)
}

async function createTune(req, res) {
  res.header('X-Tune-ID', 42)
  res.send(201)
}

async function listTunes(req, res) {
  res.send({ tunes: [{ artist: 'Alan Walker', title: 'Sky' }] })
}

async function voteOnTune(req, res) {
  res.send(201, { score: 1, voteCount: 1 })
}
