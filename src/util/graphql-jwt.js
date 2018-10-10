import { config as configEnv } from 'dotenv-safe'
import { defaultFieldResolver } from 'graphql/execution/execute.mjs'
import errors from 'restify-errors'
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import gql from 'graphql-tag'
import jwt from 'jsonwebtoken'

import User from '../db/User.js'

configEnv()

const JWT_SECRET = process.env.JWT_SECRET

export async function getUserFromReq({ req }) {
  const header = req.headers.authorization || ''
  const token = header.match(/^JWT (.+)$/)?.[1]
  if (!token) {
    return {}
  }

  const user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
  if (user) {
    const error = await User.checkMFA({
      email: user.email,
      token: req.headers['x-totp-token'],
    })
    if (error) {
      throw error
    }
  }
  return { user }
}

const authTypeMap = new Map()

// Directive maison d’autorisation
// -------------------------------
//
// La manière la plus élégante et granulaire de gérer l’autorisation en GraphQL
// consiste à écrire une directive personnalisée.
//
// On s'est basés sur la doc officielle de GraphQL-Tools à jour, notamment suite
// aux évolutions d'implémentation des directives avec GraphQL 16 (arrêt des
// *visitors* et passage aux *transformers*).  Pour plus de détails, [voir cette
// section](https://www.graphql-tools.com/docs/schema-directives#enforcing-access-permissions).
export function authDirective(directiveName = 'auth') {
  return {
    // Cette propriété contient la déclaration SDL de la directive, qui sera
    // injectée dans le schéma.
    typeDefs: gql`
      """
      Marks a whole object or field / operation as requiring authentication,
      possibly with an extra role requirement.
      """
      directive @${directiveName}(
        """An optional extra role (RBAC) requirement"""
        role: Role
      ) on OBJECT | FIELD_DEFINITION
    `,
    // Le *transformer* implémente la directive en retravaillant le schéma au
    // moyen de l'utilitaire `mapSchema`, lequel prend notre schéma est un objet
    // dont les propriétés couvrent tous les cas d'application de la directive,
    // tels que listés dans son SDL déclaratif.
    transformer(schema) {
      return mapSchema(schema, {
        // Cas `OBJECT` du SDL (directive sur type / objet complet)
        [MapperKind.TYPE](type) {
          const directive = getDirective(schema, type, directiveName)?.[0]
          if (directive) {
            authTypeMap.set(type.name, directive)
          }
        },
        // Case `FIELD_DEFINITION` du SDL (directive sur champ / opération)
        [MapperKind.OBJECT_FIELD](fieldConfig, fieldName, typeName) {
          const directive =
            getDirective(schema, fieldConfig, directiveName)?.[0] ??
            authTypeMap.get(typeName)
          if (!directive) {
            return
          }

          const { resolve = defaultFieldResolver } = fieldConfig
          const { role: requiredRole } = directive

          fieldConfig.resolve = (source, args, context, info) => {
            if (!context.user) {
              throw new errors.NotAuthorizedError(
                `${fieldName} requires authentication`
              )
            }

            if (requiredRole) {
              const dbRole = requiredRole.toLowerCase()
              if (dbRole && !(context.user.roles || []).includes(dbRole)) {
                throw new errors.NotAuthorizedError(
                  `${fieldName} requires the authenticated user to have role ${dbRole}`
                )
              }
            }

            return resolve(source, args, context, info)
          }

          return fieldConfig
        },
      })
    },
  }
}
