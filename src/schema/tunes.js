// Schémas GraphQL : Morceaux
// ==========================
import gql from 'graphql-tag'

import Tune from '../db/Tune.js'

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
    createTune(input: TuneInput!): Tune! @auth(role: ADMIN)
    voteOnTune(input: TuneVoteInput!): TuneVotePayload! @auth
  }
`

// Resolvers
// ---------
//
// C’est ici qu’on implémente concrètement la récupération des données pour les
// Queries, les modifications demandées par les Mutations, et éventuellement la
// production de valeur pour des champs qui n’existent pas à la base, ou ont des
// valeurs différentes dans la couche modèle (notamment pour les enums), de
// sorte que le *default field resolver* est insuffisant.

const resolvers = {
  Mutation: { createTune, voteOnTune },
  Query: { allTunes },
  Tune: {
    voteCount(tune) {
      return tune.votes.length
    },
  },
  TuneVote: {
    // Ici typiquement, plutôt que le champ modèle `offset`, un peu technique
    // avec ses -1/+1, on a préféré dans le schéma un concept plus métier,
    // `direction`, basé sur une enum à nous ; il fallait donc fournir une
    // résolution maison pour ce champ, que voici.
    //
    // La signature d’un *resolver* commence toujours par l’objet parent du
    // niveau courant ; puisqu’ici le niveau est « un champ de vote », le niveau
    // parent est le vote en question. On n’a pas besoin des 3 arguments
    // supplémentaires (query, context, info) donc on ne les déclare même pas.
    direction(vote) {
      return vote.offset > 0 ? 'UPVOTE' : 'DOWNVOTE'
    },
  },
}

// ### Query resolver : `allTunes`
//
// La signature d’un *resolver* commence toujours par l’objet parent du niveau
// courant, mais pour des queries et mutations, il n’y a pas de parent, c’est la
// racine du schéma : on l’appelle par convention `root` et on s’en sert très
// rarement.
async function allTunes(root, { filter, page, pageSize, sorting }) {
  const { tunes } = await Tune.search({
    filter,
    page,
    pageSize,
    // Autre mise en correspondance entre une enum maison et les données
    // techniques de la couche modèle, pour passer par exemple de
    // `'RECENT_FIRST'` à `'-createdAt'`.  Voir l’algo plus bas.
    sorting: mapTuneSorting(sorting),
  })
  return tunes
}

// ### Mutation resolver : `createTune`
function createTune(root, { input }) {
  return Tune.create(input)
}

// ### Mutation resolver : `voteOnTune`
async function voteOnTune(root, { input: { comment, direction, tuneID } }) {
  let tune = await Tune.findById(tuneID)
  // Là aussi, mapping entre l’enum du schéma et le champ technique, en somme
  // l’inverse du *resolver* pour `TuneVote#direction` plus haut.
  const offset = direction === 'UPVOTE' ? 1 : -1
  tune = await tune.vote({ comment, offset })

  const vote = tune.votes[tune.votes.length - 1]

  return { tune, vote }
}

// Notre combinaison de schémas maison suppose des objets avec `typeDefs` (les
// définitions, généralement des Strings SDL) et `resolvers`. Voir
// `src/schema/index.js` pour la combinaison.
export default { typeDefs, resolvers }

// Fonctions utilitaires internes
// ------------------------------

// Cette fonction passe des valeurs d’enum du schéma pour `TuneVoteDirection`
// aux chaînes de tri de la couche technique du modèle, interprétables par
// Mongoose.
function mapTuneSorting(tuneSort) {
  // `RECENT_FIRST` et `OLDEST_FIRST` n'ont pas de rapport syntaxique au champ
  // sous-jacent, `createdAt`, donc on fait un cas à part.
  if (tuneSort === 'RECENT_FIRST' || tuneSort === 'OLDEST_FIRST') {
    return `${tuneSort.startsWith('RECENT_') ? '-' : ''}createdAt`
  }

  // Les autres valeurs ont le format `CHAMP_(ASC|DESC)`, on peut donc
  // construire génériquement le code technique résultat.
  const [field, direction] = tuneSort.toLowerCase().split('_')
  const sign = direction === 'desc' ? '-' : ''
  return `${sign}${field}`
}
