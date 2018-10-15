// Compensations temporaires pour Restify 7
// ========================================
//
// Restify 7 a changé son implémentation interne de routeur sans faire attention
// à certains comportements clés, ce qui a cassé pas mal de choses :-/  Des Pull
// Requests sont en cours, tant dans Restify que dans des modules tiers, mais en
// attendant, on compense ici…

import Router from 'restify/lib/router.js'

// Exposition des propriétés étendues à la racine
// ----------------------------------------------
//
// Le nouveau routeur de Restify 7 ne laisse plus les propriétés custom du
// descripteur de route à même l’obejt route résultat : il les stocke dans une
// propriété `spec` de cet objet.  Ça gêne actuellement divers modules, comme
// les validateurs de requête, qui s’attendaient à trouver leur propriété
// `validation` à même l’objet route et ne sont pas au courant de cette nouvelle
// propriété `spec`.  Du coup, en attendant qu’ils se mettent à jour, on
// *monkey-patche* la méthode interne `mount` du routeur pour répliquer à même
// la route les propriétés dans `spec` qui ne présentent pas de conflit.

const oldMount = Router.prototype.mount
Router.prototype.mount = function mount(opts, handlers) {
  const route = oldMount.apply(this, arguments)

  for (const [prop, value] of Object.entries(route.spec)) {
    if (!Object.prototype.hasOwnProperty.call(route, prop)) {
      route[prop] = value
    }
  }

  return route
}
