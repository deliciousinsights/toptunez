import { config as configEnv } from 'dotenv-safe'
import emailRegex from 'email-regex'
import jwt from 'jsonwebtoken'
import { markFieldsAsPII } from 'mongoose-pii'
import mongoose from 'mongoose'

import { checkMFAToken, genMFAQRCodeURL, genMFASecret } from '../util/totp.js'

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
    mfaSecret: { type: String },
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

userSchema.plugin(markFieldsAsPII, { passwordFields: 'password' })

userSchema.virtual('requiresMFA').get(function () {
  return this.mfaSecret != null
})

Object.assign(userSchema.statics, {
  async checkMFA({ email, token }) {
    const user = await this.findOne({ email })
    if (!user.requiresMFA) {
      return null
    }

    if (!token) {
      return new Error('Missing TOTP Token (user has MFA enabled)')
    }

    if (!checkMFAToken({ secret: user.mfaSecret, token })) {
      return new Error('Invalid TOTP Token')
    }

    return null
  },

  async logIn({ email, password }) {
    const user = await this.authenticate({ email, password })
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

Object.assign(userSchema.methods, {
  isMFATokenValid(token) {
    return this.requiresMFA && checkMFAToken({ secret: this.mfaSecret, token })
  },

  async toggleMFA(enabled) {
    let mfaSecret = this.mfaSecret

    if (enabled !== this.requiresMFA) {
      mfaSecret = enabled ? genMFASecret() : null
      await this.update({ mfaSecret })
    }

    const result = { enabled }

    if (enabled) {
      result.url = await genMFAQRCodeURL({
        identifier: this.firstName,
        secret: mfaSecret,
      })
    }

    return result
  },
})

const User = mongoose.model('User', userSchema)

export default User

function getTokenForUser({ email, roles }) {
  const payload = { email, roles }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}
