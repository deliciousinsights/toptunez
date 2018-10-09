# Écriture de la mutation `createTune`

Le fichier de tests `src/schema/tunes.spec.js` a été augmenté par le _git reset_
avec un test pour la mutation `createTune`.

De son côté, l’implémentation dans `src/schema/tunes.js` a vu son schéma
augmenté par les éléments suivants :

```graphql
input TuneInput {
  album: String
  artist: String!
  title: String!
  url: URL
}

…

type Mutation {
  createTune(input: TuneInput!): Tune!
}
```

Il vous faut donc **implémenter la mutation**.

## Étapes

1. Définissez une fonction _resolver_ `createTune()`, avec la bonne signature
   (premier argument, inutilisé : `root`, deuxième argument : les paramètres,
   donc `input`).
2. Implémentez-la (ça prend _une toute petite ligne_)
3. Associez-la dans la définition des `resolvers`, pour le type racine
   `Mutation`, comme on le faisait pour le `allTunes` de `Query`…

## Validation

- Vos tests devraient passer désormais (si vous aviez une tâche `test:watch` en
  route, vérifiez son onglet de Terminal, sinon lancez un `npm test` pour
  valider)
- Dans votre [GraphQL Playground](http://localhost:3001/), posez une mutation
  simple et lancez-la (si vous gardez la _query_ dans le code, pensez à la
  nommer aussi pour lever les ambiguïtés) :

```graphql
mutation addTune {
  createTune(input: { artist: "Jain", title: "Makeba" }) {
    id
    score
    title
  }
}
```
