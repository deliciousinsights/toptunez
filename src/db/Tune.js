// Modèle de données Morceau
// =========================

import mongoose from 'mongoose'
import urlRegex from 'url-regex'

// Recours à la connexion, automatiquement établie au chargement.
import connection from './connection.js'
import { getPageDescriptors } from '../util/pagination.js'

// Schéma
// ------
//
// Dans Mongoose, pour accéder à des collections, on définit d’abord des
// *schémas*, sur base desquels on peut ensuite créer un ou plusieurs *modèles*,
// qui sont les classes ODM+métier de type ActiveRecord que le reste de la
// codebase pourra ensuite utiliser.
//
// [Plus de détails sur les schémas
// Mongoose](https://mongoosejs.com/docs/guide.html)

const tuneSchema = new mongoose.Schema(
  {
    album: String,
    artist: { type: String, required: true },
    score: { type: Number, index: true, default: 0 },
    title: { type: String, required: true },
    url: { type: String, match: urlRegex({ exact: true }) },
    votes: [
      {
        comment: String,
        // Notez que `default` est ici une fonction, qui sera appelée le moment
        // venu (et non à l’initialisation du module, heureusement !). Ça
        // renvoie en fait un `Number`, mais Mongoose construira un `Date` avec,
        // vu le type du champ, du coup ça ira bien.
        createdAt: { type: Date, default: Date.now },
        offset: { type: Number, required: true, min: -1, max: 1 },
      },
    ],
  },
  {
    // Voir ici les [détails de `strength`](https://docs.mongodb.com/manual/reference/collation/#collation-document).
    collation: { locale: 'en_US', strength: 1 },
    // Le schéma est ici super strict : si on tente de sauver un document avec
    // un champ qui n’y figure pas, il lève une exception.
    strict: 'throw',
    // Ajoute et maintient automatiquement des champs d’horodatage `createdAt`
    // et `updatedAt`.
    timestamps: true,
  }
)
// Les index multi-champs ne peuvent pas être décrits dans les descripteurs d’un
// champ unique, comme plus haut : on le fait donc par un appel ultérieur à
// `index()`.  Ici on définit un champ *full-text search*, pondéré sur 3 champs
// sources : `title`, `artist` et `album`.
//
// [Plus d’infos sur les index
// FTS](https://docs.mongodb.com/manual/core/index-text/)
tuneSchema.index(
  { album: 'text', artist: 'text', title: 'text' },
  { name: 'search', weights: { title: 10, artist: 5, album: 1 } }
)
// On a besoin de doter notre schéma de méthodes métier : une sur le modèle
// lui-même, la « classe » en somme, donc une méthode *statique* :
tuneSchema.statics.search = search
// … et une sur les documents, les instances donc (oui, je sais, avoir appelé ça
// `methods` n’était pas bien malin de la part de Mongoose) :
tuneSchema.methods.vote = vote

// Modèle
// ------

// Le premier argument est le nom du modèle dans la *registry* interne de
// Mongoose, qui va être utilisé par défaut pour déduire le nom de la collection
// (`tunes`), et servirait à la modélisation de relations N-N, par exemple si on
// associait les utilisateurs à leurs recos, au moyen du champ `ref` des
// descripteurs de champ dans les schémas.
const Tune = connection.model('Tune', tuneSchema)

// L’export par défaut est la « classe » du modèle.
export default Tune

// Méthodes métier
// ---------------

// Méthode statique : listing filtré et paginé de morceaux.
async function search({
  filter,
  page = 1,
  pageSize = 10,
  sorting = '-createdAt',
} = {}) {
  // Programmation défensive : on blinde les types et valeurs de `page` et
  // `pageSize`. S’ils sont textuels, `Number()` les convertira, et le moindre
  // caractère invalide produira un `NaN`, dont la *falsiness* nous amènera à
  // droite du `||`, vers la valeur par défaut.
  page = Number(page) || 1
  pageSize = Number(pageSize) || 10
  // Scope de base de nos travaux ; c’est en fait une `Query` Mongoose, un
  // *builder* incrémental de requêtes, quoi. C’est une promesse, et tant que
  // rien n’appelle `then()` dessus (par exemple implicitement au moyen d’un
  // `await`), on peut continuer à affiner la requête.
  let scope = this.find().sort(sorting).limit(pageSize)

  if (page > 1) {
    scope = scope.skip((page - 1) * pageSize)
  }

  filter = String(filter || '').trim()
  if (filter) {
    // Et voilà le recours à l’index full-text, grâce à l’opérateur de requête
    // `$text`, dont on utilise le seul champ indispensable, `$search` (texte de
    // la recherche).
    scope = scope.where({ $text: { $search: filter } })
  }

  // On va recourir au *scope* pour calculer le nombre total de pages concernées
  // par le contexte courant, mais si on exécutait ces opérations directement
  // sur `scope`, on exécuterait la promesse sous-jacente, qui ne serait plus
  // utilisable ensuite pour le listing à proprement parler. Alors on crée une
  // nouvelle `Query` en clonant la première.
  const countQuery = scope.clone()
  const totalCount = await (filter
    ? // Si un filtre textuel est présent, ça change le nombre de résultats,
      // on doit donc utiliser un vrai comptage, plus lourd.
      countQuery.countDocuments()
    : // Si pas de filtre, on aura l’ensemble de la collection, dont la taille
      // est connue directement par ses méta-données, alors on utilise la bonne
      // méthode pour aller (beaucoup !) plus vite.
      countQuery.estimatedDocumentCount())
  const links = getPageDescriptors({ page, pageSize, totalCount })

  return {
    links,
    // `scope` est une promesse, alors qu’on renvoie un objet de données déjà
    // résolues / accomplies, d’où l’`await` ici.
    tunes: await scope,
  }
}

// Méthode d’instance : vote sur le morceau actuel (`this`).
function vote({ offset, comment }) {
  // Toujours le blindage des arguments…
  offset = Math.sign(Number(offset) || 0)
  comment = String(comment || '').trim()

  // Finalement offset pourri ou nul ? On renvoie carrément `false`, bien fait
  // pour toi ! (plus gentiment, on renverrait `this` intact).
  if (offset === 0) {
    return this
  }

  const vote = { offset }
  if (comment) {
    vote.comment = comment
  }

  // Des opérations de niveau Mongo comme les opérateurs `$inc` et `$push` sont
  // préférables à des manips locales des champs suivies d’un `save()` (plus
  // performant), mais ne peuvent pas mettre à jour l’instance mémoire courante
  // du document.
  //
  // Plutôt que d’utiliser un `this.update()`, on va donc faire un
  // `findOneAndUpdate()` au niveau de la connexion, pour profiter de son option
  // `new: true`, qui renvoie le document après la mise à jour.
  return Tune.findOneAndUpdate(
    { _id: this.id },
    // Pour rappel, en Mongo les *updates* sont soit des documents de
    // remplacement, sans opérateurs, soit des descripteurs de modification,
    // avec opérateurs (champs dont le nom démarre par `$`).  Un opérateur a
    // toujours pour valeur un objet, dont les clés sont les champs concernés,
    // et les valeurs celles à appliquer pour ces champs, dans le cadre de cet
    // opérateur.  Ça tord un peu la tête quand on vient du SQL, mais c’est au
    // final bien plus pratique, surtout pour du multi-champs.
    { $inc: { score: offset }, $push: { votes: vote } },
    { new: true }
  )
}
