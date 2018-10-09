import chalk from 'chalk'
import mongoose from 'mongoose'

export function connectToDB(url, onConnected) {
  mongoose.connect(url, {
    connectTimeoutMS: 5000,
    useCreateIndex: true,
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const connection = mongoose.connection

  if (onConnected) {
    connection.on('connected', onConnected)
  }

  if (process.env.NODE_ENV !== 'test') {
    connection.on('connected', () => {
      console.log(
        chalk`{green ✅  Connected to mongoDB database ${connection.name}}`
      )
    })
  }

  connection.on('error', () => {
    console.error(
      chalk`{red 🔥  Could not connect to mongoDB database ${connection.name}}`
    )
  })

  return connection
}
