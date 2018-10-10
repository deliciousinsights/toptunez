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
    roles: [Role!]! @auth(role: ADMIN)
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

  type ToggleMFAPayload {
    enabled: Boolean!
    url: URL
  }

  extend type Query {
    user(email: EmailAddress!): User
  }

  extend type Mutation {
    logIn(input: LogInInput!): String
    signUp(input: SignUpInput!): String!
    toggleMFA(enabled: Boolean!): ToggleMFAPayload! @auth
  }
`

const resolvers = {
  Mutation: { logIn, signUp, toggleMFA },
  // Petite requête supplémentaire pour insister sur la granularité par champ
  // des directives.
  Query: { user },
  // Universalise la correspondance entre les chaînes GraphQL de rôles (en
  // majuscules) et celles de la base de données (en minuscules).
  Role: Object.fromEntries(
    User.ROLES.map((role) => [role.toUpperCase(), role])
  ),
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

async function toggleMFA(root, { enabled }, { user: { email } }) {
  const user = await User.findOne({ email })
  return user.toggleMFA(enabled)
}

function user(root, { email }) {
  return User.findOne({ email })
}

export default { resolvers, typeDefs }
