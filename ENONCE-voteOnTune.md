# Écriture de la mutation `voteOnTune`

Le fichier de tests `src/schema/tunes.spec.js` a été augmenté par le _git reset_
avec un test pour la mutation `voteOnTune`.

De son côté, l’implémentation dans `src/schema/tunes.js` a vu son schéma
augmenté par les éléments suivants :

```graphql
input TuneVoteInput {
  tuneID: ID!
  direction: TuneVoteDirection!
  comment: String
}

type TuneVotePayload {
  tune: Tune!
  vote: TuneVote!
}

…

type Mutation {
  …
  voteOnTune(input: TuneVoteInput!): TuneVotePayload!
}
```

Il vous faut donc **implémenter la mutation**.

## Étapes

1. Définissez une fonction _resolver_ `voteOnTune()`, avec la bonne signature
   (premier argument, inutilisé : `root`, deuxième argument : les paramètres,
   donc `input`, que vous pouvez aussi déstructurer pour obtenir `comment`,
   `direction` et `tuneID`).
2. Implémentez-la. Attention :
   - La valeur renvoyée est un objet avec `tune` et `vote`
   - Vous devrez convertir la `String` de `direction` en valeur valide (-1 /
     +1) pour `offset`.
   - Le `tune` est l’entité _mise à jour_ (score, votes, etc.). Observez la
     méthode `Tune#vote()` qu’on a déjà utilisée en mode REST.
   - Le `vote` est le vote fraîchement créé, tous champs compris, donc extrait
     en dernière place du tableau `votes` de `tune`
3. Associez-la dans la définition des `resolvers`, pour le type racine
   `Mutation`, comme dans l’exercice précédent.

## Validation

- Vos tests devraient passer désormais (si vous aviez une tâche `test:watch` en
  route, vérifiez son onglet de Terminal, sinon lancez un `npm test` pour
  valider)
- Dans votre [GraphQL Playground](http://localhost:3001/), posez une mutation
  simple et lancez-la (si vous gardez la _query_ dans le code, pensez à la
  nommer aussi pour lever les ambiguïtés) :

```graphql
mutation praiseTune {
  voteOnTune(
    input: {
      tuneID: "UN-TUNE-ID-VALIDE-ICI"
      direction: UPVOTE
      comment: "Trop de la balle ce son !"
    }
  ) {
    tune {
      score
    }
  }
}
```

## Question bonus

Il pourrait être sympa, dans la réponse pour le `tune`, donc dans le type
`Tune`, d’avoir un champ virtuel `voteCount`, qui nous donnerait juste le nombre
de votes. Ajustez le schéma et les resolvers pour le fournir, en vous basant
sur le `votes.length` d’un `tune`.
