// Utilitaires de gestion MFA / TOTP
// =================================
//
// Ce module fournit plusieurs méthodes exploitées tant par les middlewares REST
// que par les habilleurs de contexte GraphQL, ainsi que par la couche métier du
// modèle `User`, pour tout ce qui touche à la génération et à la vérification
// de facteurs d’authentification secondaire par TOTP (*Time-based One-Time
// Passwords*).

import otplib from 'otplib'
import { promisify } from 'util'
import QRCode from 'qrcode'

// L'instrumentation des imports de Jest empêche l'import nommé direct du module
// otplib, qui est en fait du CJS.  On doit donc ruser pour que ça marche
// pendant les tests.
const { authenticator } = otplib
// Le module QRCode est basé callbacks Node (error-first), mais les promesses
// c’est mieux (par exemple, on peut faire du `async/await` avec).  Du coup, on
// utilise le très populaire `util.promisify()` noyau de Node.
const genQRCodeDataURI = promisify(QRCode.toDataURL)

// Options du module TOTP
// ----------------------

authenticator.options = {
  // Tolérance sur TOTP passé : ici, celui de la fenêtre précédente est
  // autorisé, mais pas plus loin en arrière.
  window: 1,
}

// Utilitaires publics
// -------------------

// Vérifie qu’un TOTP (`token`) est valide, là tout de suite maintenant,
// vis-à-vis du `secret` qui aurait dû présider à sa génération (chez nous, ces
// secrets sont stockés dans les champs `mfaSecret` de chaque `User` pour qui
// MFA est activé).
export function checkMFAToken({ secret, token }) {
  return authenticator.verify({ secret, token })
}

// Génère un QR Code de belle taille pour la configuration d’une app
// d’authentification tierce (type [Authy](https://authy.com/)) sur base du
// *secret* d’un utilisateur.  Ce dernier doit être identifiable par
// l’utilisateur final (s’ils ont par exemple plusieurs comptes sur le même
// service), ce qui est le rôle de `identifier`, dont le contenu est libre (chez
// nous ce sera le prénom).
//
// Le QR Code est renvoyé sous forme d’une Data-URI, qui peut être utilisée tant
// comme URL directe que comme source d’une image.  L’idée étant d’éviter à
// l’utilisateur final de taper à la main un URI `otp://…` un peu longuet,
// lorsqu’on peut plus facilement scanner le QR Code avec son appareil.
export async function genMFAQRCodeURL({ identifier, secret }) {
  const uri = authenticator.keyuri(identifier, 'TopTunez', secret)
  try {
    return await genQRCodeDataURI(uri, { scale: 8 })
  } catch (err) {
    return `<QRCode Generation Error: ${err.message}>`
  }
}

// Génère un secret sécurisé (chez nous, pour peupler le champ `mfaSecret` d’un
// document de modèle `User`).  En pratique, ça revient à un appel manuel à
// `crypto.randomBytes(…).toString('hex')`` mais bon, comme ça c’est générique,
// notamment pour un usage web.
export function genMFASecret() {
  return authenticator.generateSecret()
}
