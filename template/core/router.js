import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validate } from './validator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesDir = path.resolve(__dirname, '../routes')

function compilePath(routePath) {
  const keys = []
  const pattern = routePath.replace(/:[^/]+/g, (segment) => {
    keys.push(segment.slice(1))
    return '([^/]+)'
  })
  return { regex: new RegExp(`^${pattern}$`), keys }
}

async function resolveControllerAction(action, context) {
  const [controllerName, method] = action.split('@')
  const controllerPath = path.resolve(process.cwd(), 'app/controllers', `${controllerName}.js`)
  const mod = await import(pathToFileURL(controllerPath).href)
  const Controller = mod.default
  const instance = new Controller(context)
  if (typeof instance[method] === 'function') {
    return instance[method].bind(instance)
  }
  if (typeof Controller[method] === 'function') {
    return Controller[method].bind(Controller)
  }
  throw new Error(`Controller action [${action}] is not defined.`)
}

class RouteDefinition {
  constructor(router, route) {
    this.router = router
    this.route = route
  }

  validate(RequestClass) {
    // Inserts a validation middleware before route action.
    this.route.handlers.unshift(async (req, res, next) => {
      await validate(req, RequestClass)
      return next()
    })
    return this
  }

  middleware(names) {
    const list = Array.isArray(names) ? names : [names]
    this.route.middlewareNames.push(...list)
    return this
  }

  name(name) {
    this.route.name = name
    return this
  }
}

export class Router {
  constructor(context = {}) {
    this.context = context
    this.routes = []
    this.middlewares = []
    this.docs = []
    this.middlewareAliases = new Map()
  }

  aliasMiddleware(name, handler) {
    this.middlewareAliases.set(name, handler)
  }

  register(method, routePath, action, ...handlers) {
    const { regex, keys } = compilePath(routePath)
    const route = {
      method,
      routePath,
      action,
      regex,
      keys,
      handlers: handlers.flat().filter(Boolean),
      middlewareNames: [],
      name: null
    }
    this.routes.push(route)
    this.docs.push({ method, path: routePath, action: typeof action === 'string' ? action : 'Closure' })
    return new RouteDefinition(this, route)
  }

  get(pathname, action, ...handlers) { return this.register('GET', pathname, action, ...handlers) }
  post(pathname, action, ...handlers) { return this.register('POST', pathname, action, ...handlers) }
  put(pathname, action, ...handlers) { return this.register('PUT', pathname, action, ...handlers) }
  patch(pathname, action, ...handlers) { return this.register('PATCH', pathname, action, ...handlers) }
  delete(pathname, action, ...handlers) { return this.register('DELETE', pathname, action, ...handlers) }
  use(...handlers) { this.middlewares.push(...handlers.flat()) }

  async resolveRouteHandlers(route) {
    const routeLevel = []
    for (const name of route.middlewareNames) {
      const handler = this.middlewareAliases.get(name)
      if (!handler) throw new Error(`Middleware alias [${name}] is not registered.`)
      routeLevel.push(handler)
    }

    let actionHandler = route.action
    if (typeof route.action === 'string') {
      actionHandler = await resolveControllerAction(route.action, this.context)
    }

    return [...this.middlewares, ...routeLevel, ...route.handlers, actionHandler].filter(Boolean)
  }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue
      const match = pathname.match(route.regex)
      if (match) {
        const params = route.keys.reduce((acc, key, index) => {
          acc[key] = match[index + 1]
          return acc
        }, {})
        return { route, params }
      }
    }
    return null
  }

  list() {
    return this.routes.map((route) => ({
      method: route.method,
      uri: route.routePath,
      action: typeof route.action === 'string' ? route.action : 'Closure',
      name: route.name || '-'
    }))
  }
}

export async function loadRoutes(router, context) {
  const files = await fs.readdir(routesDir)
  for (const file of files.filter((name) => name.endsWith('.js') && name !== 'console.js').sort()) {
    const mod = await import(pathToFileURL(path.join(routesDir, file)).href)
    if (typeof mod.default === 'function') {
      await mod.default(router, context)
    }
  }
}
