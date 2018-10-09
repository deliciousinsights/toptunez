# Exercice étape 5 : décliner les tests pour les autres liens

## Objectif

Nous venons d’écrire un test qui valide que les liens 'prev' et 'first' sont
bien présents au-delà de la première page (en vérifiant que leurs URLs sont
distinctes si besoin).  Finalisons maintenant le test en attente qui vérifie la
réciproque : que sur une page suffisamment tôt, les liens 'next' et 'last' sont
présents et corrects.

## Étapes

1. Retirez le `.todo` de l’appel du dernier test
2. Ajoutez un corps de fonction de test
3. Déclinez le corps de la fonction précédente pour avoir les bonnes valeurs
   dans l’objet `expectedLinks`
4. Utilisez le bon numéro de page dans la construction de route `listTunes`
