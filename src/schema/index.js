import { createComplexityLimitRule } from 'graphql-validation-complexity'
import depthLimit from 'graphql-depth-limit'
import merge from 'lodash.merge'

import { auth } from '../util/graphql-jwt.js'
import customScalarsSchema from './custom-scalars.js'
import tunesSchema from './tunes.js'
import usersSchema from './users.js'

const authSchema = { typeDefs: auth.typeDefs }

const schema = {
  ...mergeSchemas(authSchema, customScalarsSchema, tunesSchema, usersSchema),
  validationRules: [createComplexityLimitRule(1000), depthLimit(10)],
}

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
