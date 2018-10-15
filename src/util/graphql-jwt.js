// Authentification / autorisation pour GraphQL
// ============================================
//
// Ce module fournit des habilleurs de contexte et directives sur-mesure pour
// implémenter l’authentification (JWT) et l’autorisation granulaire dans notre
// gestion GraphQL.
import apollo from 'apollo-server'
import { config as configEnv } from 'dotenv-safe'
import { defaultFieldResolver } from 'graphql'
import errors from 'restify-errors'
import jwt from 'jsonwebtoken'

import User from '../db/User.js'

const { gql, SchemaDirectiveVisitor } = apollo

// Vu qu’on a besoin de certaines variables d’environnement, pour le dev et les
// tests on s’assure que `dotenv-safe` les a récupérées et mises en place dans
// `process.env`.
configEnv()

const JWT_SECRET = process.env.JWT_SECRET

// Habilleur de contexte
// ---------------------

// Afin de fournir à l’ensemble de nos *resolvers* et directives maison
// l’utilisateur courant éventuel, extrait du token JWT qui serait présent dans
// l’en-tête de requête HTTP `Authorization` reçu par le serveur Apollo, on
// fournit cet habilleur de contexte, qui le cas échéant mettra la propriété
// `user` idoine dans le contexte transverse (3e argument des *resolvers*,
// notamment).
export async function getUserFromReq({ req }) {
  // 1. On extrait le token encodé et signé de l’en-tête de requête HTTP
  const header = req.headers.authorization || ''
  const token = (header.match(/^JWT (.+)$/) || [])[1]
  if (!token) {
    return {}
  }

  // 2. On le décode et on vérifie sa signature
  const user = jwt.verify(token, JWT_SECRET)
  if (user) {
    // 2a. Le cas échéant, on vérifie que son token MFA est valide
    const error = await User.checkMFA({
      email: user.email,
      token: req.headers['x-totp-token'],
    })
    if (error) {
      throw error
    }
  }

  // 3. On renvoie les données à stocker dans le contexte GraphQL
  return { user }
}

// Directive maison d’autorisation
// -------------------------------
//
// La manière la plus élégante et granulaire de gérer l’autorisation en GraphQL
// consiste à écrire une directive personnalisée.
//
// Un article de référence explique bien le concept, qui est d’ailleurs [repris
// dans la doc officielle
// Apollo](https://www.apollographql.com/docs/apollo-server/schema/creating-directives/#enforcing-access-permissions).
// On s’est fortement inspiré de leur code pour l’implémentation ci-dessous.
// Notez au passage que savoir écrire une directive est une compétence très
// avancée : ne paniquez pas si ça ne vous parle pas, c’est bien au-delà du
// périmètre de la formation !

// L'article propose d'intégrer la déclaration de la directive directement dans
// la classe via la méthode publique statique `getDirectiveDeclaration()`.
// Toutefois, cette possibilité n'est plus là depuis GraphQL 14, qui exige la
// déclaration en amont des directives dans le schéma, d'où le `typeDefs` dédié
// ici.
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

// On exporte les segments de schéma (directive et SDL) dans une clé `auth`.
// Voir `src/schema/index.js` pour son exploitation.
export const auth = {
  directive: AuthDirective,
  typeDefs: authTypeDefs,
}
