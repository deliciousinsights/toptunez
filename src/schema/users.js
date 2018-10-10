import gql from 'graphql-tag'

import User from '../db/User.js'

// TypeDefs
// --------

const typeDefs = gql`
  type User {
    id: ID
    createdAt: DateTime!
    email: EmailAddress!
    firstName: String!
    lastName: String!
    roles: [Role!]!
  }

  enum Role {
    ADMIN
    MANAGER
  }

  input SignUpInput {
    email: EmailAddress!
    firstName: String!
    lastName: String!
    password: String!
  }

  input LogInInput {
    email: EmailAddress!
    password: String!
  }

  extend type Mutation {
    logIn(input: LogInInput!): String
    signUp(input: SignUpInput!): String!
  }
`

const resolvers = {
  Mutation: { logIn, signUp },
}

// Resolvers
// ---------

async function logIn(root, { input }) {
  const { token } = await User.logIn(input)
  return token
}

async function signUp(root, { input }) {
  const { token } = await User.signUp(input)
  return token
}

export default { resolvers, typeDefs }
