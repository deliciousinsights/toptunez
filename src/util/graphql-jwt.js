import apollo from 'apollo-server'
import { config as configEnv } from 'dotenv-safe'
import { defaultFieldResolver } from 'graphql'
import errors from 'restify-errors'
import jwt from 'jsonwebtoken'

const { gql, SchemaDirectiveVisitor } = apollo

configEnv()

const JWT_SECRET = process.env.JWT_SECRET

export async function getUserFromReq({ req }) {
  const header = req.headers.authorization || ''
  const token = (header.match(/^JWT (.+)$/) || [])[1]
  if (!token) {
    return {}
  }

  const user = jwt.verify(token, JWT_SECRET)
  return { user }
}

const authTypeDefs = gql`
  """
  Ensures there is an authenticated used, possibly with a given role,
  before accessing a field.
  """
  directive @auth(role: Role = ADMIN) on OBJECT | FIELD_DEFINITION
`

class AuthDirective extends SchemaDirectiveVisitor {
  ensureFieldsWrapped(objectType) {
    if (objectType._authFieldsWrapped) return
    objectType._authFieldsWrapped = true

    const fields = objectType.getFields()

    Object.keys(fields).forEach((fieldName) => {
      const field = fields[fieldName]
      const { resolve = defaultFieldResolver } = field
      field.resolve = async function (...args) {
        const requiredRole =
          field._requiredAuthRole || objectType._requiredAuthRole

        if (!requiredRole) {
          return resolve.apply(this, args)
        }

        const context = args[2]

        if (!context.user) {
          throw new errors.NotAuthorizedError(
            `${fieldName} requires authentication`
          )
        }

        const role = requiredRole.toLowerCase()
        if (role && !(context.user.roles || []).includes(role)) {
          throw new errors.NotAuthorizedError(
            `${fieldName} requires the authenticated user to have role ${requiredRole}`
          )
        }

        return resolve.apply(this, args)
      }
    })
  }

  visitFieldDefinition(field, details) {
    this.ensureFieldsWrapped(details.objectType)
    field._requiredAuthRole = this.args.role
  }

  visitObject(type) {
    this.ensureFieldsWrapped(type)
    type._requiredAuthRole = this.args.role
  }
}

export const auth = {
  directive: AuthDirective,
  typeDefs: authTypeDefs,
}
