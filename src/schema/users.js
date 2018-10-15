// Schémas GraphQL : Utilisateurs
// ==============================

import gql from 'graphql-tag'

import User from '../db/User.js'

// TypeDefs
// --------
//
// Les *typeDefs* sont le texte SDL (*Schema Definition Language*) ou le
// résultat de son analyse (comme ici, après être passé par le *tagger* de
// chaîne à gabarit `gql()`, fourni par Apollo Server).  Il s’agit
// conceptuellement de la partie **déclarative** du schéma, pas de son
// implémentation (ça, ce seront les *resolvers*).
//
// Besoin de réviser votre GraphQL ?
//
// - [Sur GraphQL.org](https://graphql.org/learn/)
// - [Sur How To GraphQL](https://www.howtographql.com/basics/2-core-concepts/)
// - [La spec
//   officielle](https://facebook.github.io/graphql/June2018/#sec-Type-System)
//   (moins digeste !)

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
//
// C’est ici qu’on implémente concrètement la récupération des données pour les
// Queries, les modifications demandées par les Mutations, et éventuellement la
// production de valeur pour des champs qui n’existent pas à la base, ou ont des
// valeurs différentes dans la couche modèle (notamment pour les enums), de
// sorte que le *default field resolver* est insuffisant.

// ### Mutation resolver : `logIn`
//
// La signature d’un *resolver* commence toujours par l’objet parent du niveau
// courant, mais pour des queries et mutations, il n’y a pas de parent, c’est la
// racine du schéma : on l’appelle par convention `root` et on s’en sert très
// rarement.
async function logIn(root, { input }) {
  const { token } = await User.logIn(input)
  return token
}

// ### Mutation resolver : `signUp`
async function signUp(root, { input }) {
  const { token } = await User.signUp(input)
  return token
}

// ### Mutation resolver : `toggleMFA`
async function toggleMFA(root, { enabled }, { user: { email } }) {
  const user = await User.findOne({ email })
  return user.toggleMFA(enabled)
}

// ### Query resolver : `user`
function user(root, { email }) {
  return User.findOne({ email })
}

// Notre combinaison de schémas maison suppose des objets avec `typeDefs` (les
// définitions, généralement des Strings SDL) et `resolvers`. Voir
// `src/schema/index.js` pour la combinaison.
export default { resolvers, typeDefs }
