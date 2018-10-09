## 22 avril 2022

### Améliorations de code

- Plus de recours temporaire à `this.find(scope.getQuery())` au lieu de `scope.clone()` dans les méthodes métier des modèles Mongoose.
- Exploitation du validateur `isMongoId` au lieu d'une regex pour les requêtes REST
- Connexion dynamique au schéma du serveur GraphQL depuis l'extension VS Code pour une meilleure complétion / validation des textes GraphQL du code source.
- Simplification d'un test de réponse GraphQL en utilisant `toEqual()` et `expect.stringMatching()` plutôt que deux tests partiels de structure.
- Restriction des vérifications de tokens JWT à l'algorithme choisi (HS256).
- Simplification du code de configuration CORS, notamment côté Apollo.
- La politique CORS n'autorise plus des clients `localhost` en mode production.

## 3 avril 2022

### ESM & JSON

Le recours à l'import de modules JSON au sein d'ESM nécessitait des drapeaux CLI spécifiques un peu partout (`--experimental-json-modules`) et gênait sur Node >= 16.14 en raison de l'exigence d'assertions d'import (ex. `import TUNES from '../fixtures/tunes.json' assert { type: 'json' }`), lesquelles sont encore au stade 3 du TC39 et donc embêtantes pour un ESLint pur (sans Babel).

Vu l'usage qu'on en faisait, on a simplement migré sur un ESM avec un `export default` devant le littéral, ce qui permet de marcher sur du Node récent avec un ESLint brut, sans recourir à Babel notamment.

### Dépendances

Afin d'éviter tout risque d'installation basé `package.json` (ex. `package-lock.json` antérieur), comme sur Heroku par exemple, qui rencontrerait des soucis de dépendances pairs (_peer deps_), on a migré certains modules :

- `graph-scalars` au lieu de `@saeris/graphql-scalars`. Plus moderne, TS-friendly, à jour sur GraphQL 16 là où le précédent utilisait un vieux GraphQL 14.
- `restify-cors-middleware2` au lieu de `restify-cors-middleware`. Un fork qui a suivi les versions de Restify (notamment la 8.x) et améliore encore la conformité à la spec CORS officielle.
- `eslint-config-standard` en `@next` pour attraper la 7.x, qui accepte ESLint 8.x (la stable est restée sur ESLint 7, déjà "ancien"…).

## Fin décembre 2021

### Outillage

- Mise à jour de toutes les dépendances
- Bascule vers Apollo 3 et GraphQL 16, ce qui a nécessité pas mal d'adaptations / réécritures.
- Exigence de Node 14+ (pour les ESM natifs ; préférer 15+)

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
