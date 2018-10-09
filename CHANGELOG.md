## Session décembre 2018

### Améliorations

- Tâches explicites `dev` et `graphql:dev` pour le développement des serveurs
- Harmonisation `async`/`await` de `src/graphql-server.js`.
- Champ GraphQL virtuel `voteCount` avec _resolver_ dédié.
- Simplification du _resolver_ de `createTune`, en tirant parti de la
  prévalidation inhérente à GraphQL.
- Simplification des tests de réponse GraphQL, en tirant parti du fait que la
  grappe résultat ne contient par définition que ce qu’on a demandé : un
  `toEqual()` suffit, au lieu d’un `toMatchObject()`.

### Outillage

- Mise à jour de toutes les dépendances et outils
- Reformatage propre des commentaires et annotations
- Toutes les scripts npm sont prédéfinis sans analyseur de sortie VSCode, pour
  éviter le prompt VSCode à l’exécution (`.vscode/tasks.json`)

## Changements post-session inaugurale

- Nettoyage général du code (DRY, réordonnancements…)
- Code annoté complet
- Fix tests contrôleur REST des _tunes_ une fois le RBAC mis en place
- Plus d’extensions VS Code recommandées
- Restriction du contenu zippé pour les déploiements Azure
