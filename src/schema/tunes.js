import gql from 'graphql-tag'

import Tune from '../db/Tune.js'

// Typedefs
// --------

const typeDefs = gql`
  type Tune {
    id: ID
    album: String
    artist: String!
    createdAt: DateTime!
    score: Int!
    title: String!
    url: URL
    votes: [TuneVote!]!
  }

  type TuneVote {
    comment: String
    createdAt: DateTime!
    direction: TuneVoteDirection!
  }

  enum TuneVoteDirection {
    UPVOTE
    DOWNVOTE
  }

  enum TuneSort {
    RECENT_FIRST
    OLDEST_FIRST
    ALBUM_ASC
    ALBUM_DESC
    ARTIST_ASC
    ARTIST_DESC
    SCORE_ASC
    SCORE_DESC
    TITLE_ASC
    TITLE_DESC
  }

  type Query {
    allTunes(
      filter: String
      page: Int = 1
      pageSize: Int = 10
      sorting: TuneSort = RECENT_FIRST
    ): [Tune!]!
  }
`

// Resolvers
// ---------

const resolvers = {
  Query: { allTunes },
  TuneVote: {
    direction(vote) {
      return vote.offset > 0 ? 'UPVOTE' : 'DOWNVOTE'
    },
  },
}

async function allTunes(root, { filter, page, pageSize, sorting }) {
  const { tunes } = await Tune.search({
    filter,
    page,
    pageSize,
    sorting: mapTuneSorting(sorting),
  })
  return tunes
}

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
