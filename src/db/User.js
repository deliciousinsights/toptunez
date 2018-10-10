import { config as configEnv } from 'dotenv-safe'
import emailRegex from 'email-regex'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

configEnv()

const JWT_EXPIRY = '30m'
const JWT_SECRET = process.env.JWT_SECRET
const ROLES = ['admin', 'manager']

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
    roles: { type: [{ type: String, enum: ROLES }], index: true },
  },
  {
    collation: { locale: 'en_US', strength: 1 },
    strict: 'throw',
    strictQuery: true,
    timestamps: true,
    useNestedStrict: true,
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

  async signUp({ email, firstName, lastName, password, roles }) {
    const user = await this.create({
      email,
      firstName,
      lastName,
      password,
      roles,
    })
    const token = getTokenForUser(user)
    return { user, token }
  },
})

const User = mongoose.model('User', userSchema)

export default User

function getTokenForUser({ email, roles }) {
  const payload = { email, roles }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}
