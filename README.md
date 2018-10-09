# TopTunez : appli fil rouge pour la formation Node.js de Delicious Insights

[Voir les détails de la formation](https://delicious-insights.com/fr/formations/node-js/)

[Voir le code annoté](https://deliciousinsights.github.io/toptunez/)

## Mise en place

```bash
git clone https://github.com/deliciousinsights/toptunez
cd toptunez
npm install
```

## Branches et tags

- La branche par défaut, `formation`, démarre sur le premier commit de l’historique, le socle initial.
- La branche `master` comprend tous les commits du déroulé, chacun étant multi-tagué. On peut donc revoir l’appli se construire en examinant l’historique commit par commit (aucun commit superflu).

## Générer des secrets pour l’environnement

Certaines fonctionnalités (JWT, Mongoose PII…) nécessitent le renseignement de clés 128-bit, dans le `.env` pour le dev et les tests, ou dans les configurations d’hébergement pour le déploiement.

Un moyen simple de générer ces clés est la ligne de commande suivante :

```bash
# Pour obtenir de l’hexa
node -pe "crypto.randomBytes(16).toString('hex')"
# Pour obtenir du Base64, plus « aléatoire » d’aspect :-)
node -pe "crypto.randomBytes(24).toString('base64')"
```
