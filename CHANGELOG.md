## Session décembre 2020

### Améliorations

- Passage aux modules ESM natifs (y compris avec Jest). Nécessite Node 14+.
- Exploitation de la stack Apollo complète dans les tests GraphQL, afin
  notamment de tester les directives.
- Tests GraphQL autour de l'authentification

### Outillage

- Mise à jour de toutes les dépendances
- Passage à 'apollo-server-testing' pour les tests GraphQL
- Exigence de Node 14+ (pour les ESM natifs)

## Session juin 2020

### Améliorations

- Normalisation (minuscules) de l’email utilisateur directement dans la couche
  modèle, ce qui simplifie les appels depuis les contrôleurs et _resolvers_.
- L’utilitaire `run` des tests GraphQL signale désormais correctement les
  erreurs d’interprétation de la requête par le moteur (ex. champ inconnu).
- Le _audit logger_ du serveur REST retranscrit désormais les méta-données du
  champ `info` des erreurs « maison » (telles que celles de `restify-errors`).
- La signature du _middleware_ `cors` préserve désormais les valeurs par défaut
  individuelles en cas d’appel avec seulement certaines options.
- Renommage fichier de _monkeypatch_ du routeur de Restify.

### Outillage

- Mise à jour de la connexion Apollo Engine (détection auto de la clé
  `APOLLO_KEY`, nouveau mode de _reporting_ automatique du schéma à jour).
- Mise à jour de toutes les dépendances et outils

## Session janvier 2020

### Améliorations

- On ne s'amuse plus à gérer la révocation côté serveur des JWT, surtout qu'ils
  expirent à 30 minutes de base… Ça simplifie la démo et le workflow pour se
  concentrer sur le cœur du truc.
- Bascule de `restify-request-validator` à `node-restify-validation`, nettement
  plus complet, moins friable et sans bug idiot sur la source d’analyse des
  paramètres du chemin d’URL.
- Correction de la fermeture finale des connexion MongoDB pendant les tests
- Refactoring des `reduce()` qui restaient, qui n’étaient finalement que des
  boucles déguisées, pour plus de lisibilité.
- Extraction de la logique de construction des descripteurs de pagination dans
  un utilitaire pré-fourni, pour ne pas faire de bruit inutile lors des étapes
  successives de construction (simulé dans le contrôleur, puis en méthode métier
  sur le modèle).
- Passage de `dotenv` à `dotenv-safe`, avec son `.env.example`, pour coller
  davantage aux meilleures pratiques.
- Utilisation de Mongoose-PII uniquement pour les champs de mot de passe, car on
  recommande plutôt du _Encryption at rest_ pour le chiffrement des PII.
- Lecture unique des clés d’environnement, en accord avec les meilleures
  pratiques recommandées.

### Outillage

- Mise à jour de toutes les dépendances et outils

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
