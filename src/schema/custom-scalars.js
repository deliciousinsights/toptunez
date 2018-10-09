import {
  DateTime,
  DateTimeScalar,
  EmailAddress,
  EmailAddressScalar,
  URL,
  URLScalar,
} from '@saeris/graphql-scalars'

const customScalarsSchema = {
  typeDefs: `
    ${DateTimeScalar}
    ${EmailAddressScalar}
    ${URLScalar}
  `,
  resolvers: { DateTime, EmailAddress, URL },
}

export default customScalarsSchema
