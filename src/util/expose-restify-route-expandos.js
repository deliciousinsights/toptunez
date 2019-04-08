import Router from 'restify/lib/router.js'

// Make route custom props available as own props
// ----------------------------------------------
//
// (with the latest Restify, they go into the `spec` own prop, which breaks all
// major restify request validator modules)

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
