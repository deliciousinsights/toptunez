import chalk from 'chalk'

import { createServer } from './app.js'

const PORT = Number(process.env.PORT) || 3000

initServer()

function initServer() {
  const server = createServer()

  server.listen(PORT, () => {
    console.log(
      chalk`{green ✅  ${server.name} REST server started at} {cyan.underline ${server.url}}`
    )
  })
}
