// Schémas GraphQL : schéma consolidé
// ==================================
//
// Notre schéma est découpé en sous-parties thématiques, chacune danss on
// module :
//
// - `custom-scalars` fournit des scalaires supplémentaires (ex. `DateTime`)
// - `tunes` s’occupe des Morceaux (création, listing, vote)
// - `users` des utilisateurs (inscription, connexion, bascule MFA)
//
// Ce module combine les parties tout en ajoutant les règles de validation qui
// mitigent les risques de DoS (limites de complexité et de profondeur).
import { createComplexityLimitRule } from 'graphql-validation-complexity'
import depthLimit from 'graphql-depth-limit'
import merge from 'lodash.merge'

import { auth } from '../util/graphql-jwt.js'
import customScalarsSchema from './custom-scalars.js'
import tunesSchema from './tunes.js'
import usersSchema from './users.js'

const authSchema = { typeDefs: auth.typeDefs }

// Production du schéma consolidé
// ------------------------------

const schema = {
  // Le résultat de notre fonction utilitaire `mergeSchemas()` (ci-dessous) est
  // un objet avec les clés `resolvers` et `typeDefs`, qu’on reprend ici au sein
  // du littérral objet courant, pour ajouter une clé `validationRules`.
  //
  // Cette syntaxe de *spread* sur objets basiques est officielle depuis ES2018
  // mais prise en charge nativement depuis plusieurs années. C’est la
  // fonctionnalité “Rest/Spread Properties” du langage.
  ...mergeSchemas(authSchema, customScalarsSchema, tunesSchema, usersSchema),
  validationRules: [createComplexityLimitRule(1000), depthLimit(10)],
}

export default schema

// Fonctions utilitaires internes
// ------------------------------

function mergeSchemas(...schemas) {
  const result = { typeDefs: [], resolvers: {} }

  for (const { typeDefs = '', resolvers = {} } of schemas) {
    // Le `typeDefs` résultat est un tableau, donc on `push`
    result.typeDefs.push(typeDefs)
    // Les `resolvers` sont des objets imbriqués, on fait donc une fusion
    // profonde grâce à `lodash.merge`.
    merge(result.resolvers, resolvers)
  }

  return result
}
