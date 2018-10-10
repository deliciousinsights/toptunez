import emailRegex from 'email-regex'
import mongoose from 'mongoose'

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
    strictQuery: true,
    timestamps: true,
    useNestedStrict: true,
  }
)
Object.assign(userSchema.statics, {
  async logIn({ email, password }) {
    const user = await this.findOne({ email, password })
    return { user }
  },

  async signUp({ email, firstName, lastName, password }) {
    const user = await this.create({ email, firstName, lastName, password })
    return { user }
  },
})

const User = mongoose.model('User', userSchema)

export default User
