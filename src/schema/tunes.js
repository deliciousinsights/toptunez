import gql from 'graphql-tag'

import Tune from '../db/Tune.js'

// Typedefs
// --------

const typeDefs = gql`
  type Query {
    fixme: String
  }
`

// Resolvers
// ---------

const resolvers = {}

export default { typeDefs, resolvers }

// Helper functions
// ----------------

function mapTuneSorting(tuneSort) {
  if (tuneSort === 'RECENT_FIRST' || tuneSort === 'OLDEST_FIRST') {
    return `${tuneSort.startsWith('RECENT_') ? '-' : ''}createdAt`
  }

  const [field, direction] = tuneSort.toLowerCase().split('_')
  const sign = direction === 'desc' ? '-' : ''
  return `${sign}${field}`
}
