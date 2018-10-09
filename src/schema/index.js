import merge from 'lodash.merge'

import customScalarsSchema from './custom-scalars.js'
import tunesSchema from './tunes.js'

const schema = mergeSchemas(customScalarsSchema, tunesSchema)

export default schema

// Helper functions

function mergeSchemas(...schemas) {
  const result = { typeDefs: [], resolvers: {} }

  for (const { typeDefs = '', resolvers = {} } of schemas) {
    result.typeDefs.push(typeDefs)
    merge(result.resolvers, resolvers)
  }

  return result
}
