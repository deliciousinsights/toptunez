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
    voteCount: Int!
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

  input TuneInput {
    album: String
    artist: String!
    title: String!
    url: URL
  }

  input TuneVoteInput {
    tuneID: ID!
    direction: TuneVoteDirection!
    comment: String
  }

  type TuneVotePayload {
    tune: Tune!
    vote: TuneVote!
  }

  type Query {
    allTunes(
      filter: String
      page: Int = 1
      pageSize: Int = 10
      sorting: TuneSort = RECENT_FIRST
    ): [Tune!]!
  }

  type Mutation {
    createTune(input: TuneInput!): Tune!
    voteOnTune(input: TuneVoteInput!): TuneVotePayload!
  }
`

// Resolvers
// ---------

const resolvers = {
  Mutation: { createTune, voteOnTune },
  Query: { allTunes },
  Tune: {
    voteCount(tune) {
      return tune.votes.length
    },
  },
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

function createTune(root, { input }) {
  return Tune.create(input)
}

async function voteOnTune(root, { input: { comment, direction, tuneID } }) {
  let tune = await Tune.findById(tuneID)
  const offset = direction === 'UPVOTE' ? 1 : -1
  tune = await tune.vote({ comment, offset })

  const vote = tune.votes[tune.votes.length - 1]

  return { tune, vote }
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
