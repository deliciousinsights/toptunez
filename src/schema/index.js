// Schémas GraphQL : schéma consolidé
// ==================================
//
// Notre schéma est découpé en sous-parties thématiques, chacune danss on
// module :
//
// - `custom-scalars` fournit des scalaires supplémentaires (ex. `DateTime`)
// - `tunes` s’occupe des Morceaux (création, listing, vote)
// - `users` des utilisateurs (inscription, connexion, bascule MFA)
//
// Ce module combine les parties tout en ajoutant les règles de validation qui
// mitigent les risques de DoS (limites de complexité et de profondeur).
import { createComplexityLimitRule } from 'graphql-validation-complexity'
import depthLimit from 'graphql-depth-limit'
import { makeExecutableSchema } from '@graphql-tools/schema'
import merge from 'lodash.merge'

import { authDirective } from '../util/graphql-jwt.js'
import customScalarsSchema from './custom-scalars.js'
import tunesSchema from './tunes.js'
import usersSchema from './users.js'

// Production du schéma consolidé
// ------------------------------

export function buildSchema() {
  let schema = mergeSchemas(
    authDirective(),
    customScalarsSchema,
    tunesSchema,
    usersSchema
  )
  const transformer = schema.transformer
  schema = makeExecutableSchema(schema)
  if (typeof transformer === 'function') {
    schema = transformer(schema)
  }
  return schema
}

export const validationRules = [createComplexityLimitRule(1000), depthLimit(10)]

// Fonctions utilitaires internes
// ------------------------------

function mergeSchemas(...schemas) {
  const result = {
    typeDefs: [],
    resolvers: {},
    transformer: (schema) => schema,
  }

  for (const { typeDefs = '', resolvers = {}, transformer = null } of schemas) {
    // Le `typeDefs` résultat est un tableau, donc on `push`
    result.typeDefs.push(typeDefs)
    // Les `resolvers` sont des objets imbriqués, on fait donc une fusion
    // profonde grâce à `lodash.merge`.
    merge(result.resolvers, resolvers)
    // Les *transformers* sont *curried* (appels de fonctions imbriqués)
    if (typeof transformer === 'function' && transformer.length === 1) {
      const priorTrans = result.transformer
      result.transformer = priorTrans
        ? (x) => transformer(priorTrans(x))
        : transformer
    }
  }

  return result
}
