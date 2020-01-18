import { config as configEnv } from 'dotenv-safe'
import emailRegex from 'email-regex'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import connection from './connection.js'

configEnv()

const JWT_EXPIRY = '30m'
const JWT_SECRET = process.env.JWT_SECRET

const userSchema = new mongoose.Schema(
  {
    email: {
      index: true,
      lowercase: true,
      match: emailRegex({ exact: true }),
      required: true,
      type: String,
      unique: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
  },
  {
    collation: { locale: 'en_US', strength: 1 },
    strict: 'throw',
    timestamps: true,
  }
)
Object.assign(userSchema.statics, {
  async logIn({ email, password }) {
    const user = await this.findOne({ email, password })
    if (!user) {
      return { user }
    }

    const token = getTokenForUser(user)
    return { user, token }
  },

  async signUp({ email, firstName, lastName, password }) {
    const user = await this.create({ email, firstName, lastName, password })
    const token = getTokenForUser(user)
    return { user, token }
  },
})

const User = connection.model('User', userSchema)

export default User

function getTokenForUser({ email }) {
  const payload = { email }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}
