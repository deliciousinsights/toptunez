import { config as configEnv } from 'dotenv-safe'
import { defaultFieldResolver } from 'graphql/execution/execute.mjs'
import errors from 'restify-errors'
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import gql from 'graphql-tag'
import jwt from 'jsonwebtoken'

configEnv()

export async function getUserFromReq({ req }) {
  // FIXME: Return a context object, with a valid `user` key if we have an
  // authenticated user
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
