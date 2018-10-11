const serverless = require('serverless-http')

const { createServer } = require('./app')
const server = createServer()
const handler = server._onRequest.bind(server)

module.exports.handler = serverless(handler)
