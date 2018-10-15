# Dossier cors-origin

Ce dossier permet d’obtenir facilement une origine HTTP(S)
distincte de celle des serveurs REST/GraphQL, pour faire des
démonstrations de requêtes CORS.

## Utilisation sur OSX avec Puma-Dev

Il suffit de faire un lien symbolique vers le dossier `cors-origin`,
comme d’habitude. Depuis ce dernier, faites simplement :

```bash
cors-origin$ puma-dev link
```

Et du coup vous avez https://cors-origin.dev/` qui marche.

## Utilisation avec Rackup

Partout où on a Ruby (OSX, Linux, et Windows en l’installant), on a
normalement [Rack](https://rack.github.io/). Vous pouvez alors lancer, depuis ce
dossier :

```bash
cors-origin$ rackup
```

Ça lira la configuration dans `config.ru` et lancera votre serveur
sur le port 9292 (par défaut), du coup http://localhost:9292 marchera.
