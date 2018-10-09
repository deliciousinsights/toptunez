// Schémas GraphQL : scalaires personnalisés
// =========================================
//
// GraphQL fournit de base un certain nombre de scalaires (ex. Int, Float,
// String, Bool) mais ne standardise pas de type Date/DateTime, et encore moins
// des types plus spécialisés, pour les URLs ou les adresses e-mail, par
// exemple.
//
// On utilise ici un des principaux modules npm qui définissent des scalaires
// génériques supplémentaires, dont on repend `DateTime`, `EmailAddress` et
// `URL`.

import {
  DateTimeResolver,
  DateTimeTypeDefinition,
  EmailAddressResolver,
  EmailAddressTypeDefinition,
  URLResolver,
  URLTypeDefinition,
} from 'graphql-scalars'

// Notre combinaison de schémas maison suppose des objets avec `typeDefs` (les
// définitions, généralement des Strings SDL) et `resolvers`. Voir
// `src/schema/index.js` pour la combinaison.
const customScalarsSchema = {
  typeDefs: `
    ${DateTimeTypeDefinition}
    ${EmailAddressTypeDefinition}
    ${URLTypeDefinition}
  `,
  resolvers: {
    DateTime: DateTimeResolver,
    EmailAddress: EmailAddressResolver,
    URL: URLResolver,
  },
}

export default customScalarsSchema
