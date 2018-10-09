import { makeExecutableSchema } from '@graphql-tools/schema'
import merge from 'lodash.merge'

import customScalarsSchema from './custom-scalars.js'
import tunesSchema from './tunes.js'

// Production du schéma consolidé
// ------------------------------

export function buildSchema() {
  let schema = mergeSchemas(customScalarsSchema, tunesSchema)
  schema = makeExecutableSchema(schema)
  return schema
}

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
