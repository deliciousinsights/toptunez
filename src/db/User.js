// Modèle de données Utilisateur
// =============================

import { config as configEnv } from 'dotenv-safe'
import emailRegex from 'email-regex'
import jwt from 'jsonwebtoken'
import { markFieldsAsPII } from 'mongoose-pii'
import mongoose from 'mongoose'

import { checkMFAToken, genMFAQRCodeURL, genMFASecret } from '../util/totp.js'
// Recours à la connexion, automatiquement établie au chargement.
import connection from './connection.js'

// Vu qu’on a besoin de certaines variables d’environnement, pour le dev et les
// tests on s’assure que `dotenv-safe` les a récupérées et mises en place dans
// `process.env`.
configEnv()

// Nos JWT expirent à 30 minutes par défaut.
const JWT_EXPIRY = '30m'
const JWT_SECRET = process.env.JWT_SECRET
// Les rôles autorisés se limitent pour le moment à `admin`, `manager` ou rien.
const ROLES = ['admin', 'manager']

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

const userSchema = new mongoose.Schema(
  {
    email: {
      index: true,
      lowercase: true,
      match: emailRegex({ exact: true }),
      required: true,
      type: String,
      unique: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    mfaSecret: { type: String },
    password: { type: String, required: true },
    roles: { type: [{ type: String, enum: ROLES }], index: true },
  },
  {
    // Voir ici les [détails de
    // `strength`](https://docs.mongodb.com/manual/reference/collation/#collation-document).
    collation: { locale: 'en_US', strength: 1 },
    // Le schéma est ici super strict : si on tente de sauver un document avec
    // un champ qui n’y figure pas, il lève une exception.
    strict: 'throw',
    // Ajoute et maintient automatiquement des champs d’horodatage `createdAt`
    // et `updatedAt`.
    timestamps: true,
  }
)

// Afin de respecter l’état de l’art des bonnes pratiques de sécurité en termes
// de stockage de données, on utilise
// [Mongoose-PII](https://github.com/deliciousinsights/mongoose-pii#readme), un
// plugin qui va *hasher* de façon optimale les mots de passe.
userSchema.plugin(markFieldsAsPII, { passwordFields: 'password' })

// Pour faciliter le côté métier, on crée un champ virtuel, calculé, qui nous
// indique à tout instant si l’utilisateur a MFA actif.  Il suffit en fait de
// vérifier si `mfaSecret` n’est ni `null` ni `undefined` (d’où le double égale
// et non le triple, plus strict).
//
// Notez qu’ici on ne pourrait pas utiliser une fonction fléchée en argument, vu
// qu’on doit pouvoir garantir le `this` à l’intérieur, et donc le *binding* par
// Mongoose, ce qu’une fléchée ne permet pas.
//
// [Plus d’info sur les champs calculés
// Mongoose](https://mongoosejs.com/docs/guide.html#virtuals)
userSchema.virtual('requiresMFA').get(function () {
  return this.mfaSecret != null
})

// Méthodes métier statiques
// -------------------------

Object.assign(userSchema.statics, {
  // Vérifie qu’un utilisateur, identifié par son e-mail, soit n’a pas MFA
  // activé, soit l’a et que le TOTP (`token`) passé est alors valide.  Utilisé
  // par un middleware REST et l’habilleur de contexte GraphQL pour confirmer
  // l’authentification.
  async checkMFA({ email, token }) {
    // On récupère l’utilisateur identifié par cet e-mail, et s’il ne requiert
    // pas de MFA, on renvoie `null` pour dire que tout est OK (pas d’erreur)…
    const user = await this.findOne({ email })
    if (!user.requiresMFA) {
      return null
    }

    // Si on exige MFA mais qu’on n’a pas reçu de TOTP, il manque un truc,
    // l’authentification est incomplète !
    if (!token) {
      return new Error('Missing TOTP Token (user has MFA enabled)')
    }

    // Si le TOTP reçu n’est pas valide là tout de suite, l’authentification est
    // incorrecte !
    if (!checkMFAToken({ secret: user.mfaSecret, token })) {
      return new Error('Invalid TOTP Token')
    }

    // On est toujours là ? MFA valide alors, youpi, pas de souci à renvoyer.
    return null
  },

  // Connecte un utilisateur existant
  async logIn({ email, password }) {
    // La méthode `authenticate()` est fournie par Mongoose-PII.  Elle va
    // auto-chiffrer les champs de requête nécessaires (ici `email`), et
    // réaliser une comparaison BCcrypt sécurisée sur le mot de passe,
    // résistante notamment aux *timing attacks*.
    const user = await this.authenticate({ email, password })
    if (!user) {
      // Échec ? OK, on renvoie `{ user: null }`.
      return { user }
    }

    // Sinon, on génère un JWT à jour et on renvoie l’ensemble.
    const token = getTokenForUser(user)
    return { user, token }
  },

  // On expose la liste des rôles possibles comme propriété statique, pour
  // permettre au reste du code (par exemple le schéma GraphQL) d’y accéder.
  ROLES,

  // Inscription d’un nouvel utilisateur
  async signUp({ email, firstName, lastName, password, roles }) {
    // On permet ici les rôles non pour que l‘API le permette aussi (elle ne le
    // fait pas, ce serait dangereux), mais pour faciliter les constructions
    // lors de nos tests, notamment pour avoir des utilisateurs de test qui
    // soient administrateurs, et donc autorisés à créer des morceaux.
    const user = await this.create({
      email,
      firstName,
      lastName,
      password,
      roles,
    })

    // On génère un JWT à jour et on renvoie l’ensemble, comme pour la
    // connexion.
    const token = getTokenForUser(user)
    return { user, token }
  },
})
// Méthodes métier d’instance
// --------------------------

Object.assign(userSchema.methods, {
  // Bascule l’activation du MFA.
  async toggleMFA(enabled) {
    let mfaSecret = this.mfaSecret

    // On évite de changer le *MFA Secret* si en fait on est déjà activés et
    // qu’on souhaite le rester, ça invaliderait les authentificateurs déjà
    // configurés…
    if (enabled !== this.requiresMFA) {
      mfaSecret = enabled ? genMFASecret() : null
      await this.update({ mfaSecret })
    }

    const result = { enabled }

    // Si on a MFA actif, on calcule la Data-URI d’un QR Code de configuration
    // d’app tierce, type [Authy](https://authy.com/), pour faciliter la vie des
    // utilisateurs et leur éviter de taper un URI `otp://` à la main…
    if (enabled) {
      result.url = await genMFAQRCodeURL({
        identifier: this.firstName,
        secret: mfaSecret,
      })
    }

    return result
  },
})

// Modèle
// ------

// Le premier argument est le nom du modèle dans la *registry* interne de
// Mongoose, qui va être utilisé par défaut pour déduire le nom de la collection
// (`users`), et servirait à la modélisation de relations N-N, par exemple si on
// associait les utilisateurs à leurs recos, au moyen du champ `ref` des
// descripteurs de champ dans les schémas.
const User = connection.model('User', userSchema)

// L’export par défaut est la « classe » du modèle.
export default User

// Méthodes utilitaires internes
// -----------------------------

// Construit un JWT sur base d’un utilisateur, le *payload* restranscrivant ici
// uniquement son e-mail et ses rôles.
function getTokenForUser({ email, roles }) {
  const payload = { email, roles }
  // Le calcul, la signature cryptographique et l’encodage Base64 du JWT sont
  // ici, délégués au module de référence, `jsonwebtoken`, importé en `jwt`.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}
