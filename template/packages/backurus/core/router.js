import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { validate } from './validator.js'
import { limit } from './helpers/limit.js'

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

  const resolveCandidates = (name) => {
    const cwd = process.cwd()
    const normalized = String(name || '')

    const moduleSplit = normalized.includes('::') ? normalized.split('::') : null
    const pathSplit = normalized.includes('/') ? normalized.split('/') : null

    if (moduleSplit) {
      const [moduleName, controllerFile] = moduleSplit
      const moduleLower = String(moduleName || '').toLowerCase()
      return [
        path.resolve(cwd, 'modules', moduleLower, 'controllers', `${controllerFile}.js`),
        path.resolve(cwd, 'modules', moduleName, 'controllers', `${controllerFile}.js`),
        path.resolve(cwd, 'app/modules', moduleName, 'controllers', `${controllerFile}.js`)
      ]
    }

    if (pathSplit) {
      const [moduleName, ...rest] = pathSplit
      const controllerFile = rest.join('/')
      const moduleLower = String(moduleName || '').toLowerCase()
      return [
        path.resolve(cwd, 'modules', moduleLower, 'controllers', `${controllerFile}.js`),
        path.resolve(cwd, 'modules', moduleName, 'controllers', `${controllerFile}.js`),
        path.resolve(cwd, 'app/modules', moduleName, 'controllers', `${controllerFile}.js`)
      ]
    }

    return [
      path.resolve(cwd, 'app/controllers', `${normalized}.js`)
    ]
  }

  const candidates = resolveCandidates(controllerName)
  let mod = null
  let lastError = null
  for (const candidate of candidates) {
    try {
      mod = await import(pathToFileURL(candidate).href)
      break
    } catch (error) {
      lastError = error
    }
  }
  if (!mod) throw lastError || new Error(`Controller [${controllerName}] not found.`)

  const Controller = mod.default
  const deps = Array.isArray(Controller?.inject) ? Controller.inject : null
  const instance = deps && context?.container
    ? new Controller(...deps.map((key) => context.container.make(key)))
    : new Controller(context)
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

  throttle(max, windowSeconds, name = null) {
    const key = name || `${this.route.method}:${this.route.routePath}`
    this.route.handlers.unshift(limit(key, max, windowSeconds))
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
    this.groupStack = []
  }

  aliasMiddleware(name, handler) {
    this.middlewareAliases.set(name, handler)
  }

  register(method, routePath, action, ...handlers) {
    const groupPrefix = this.groupStack.map((g) => g.prefix).join('')
    const fullPath = `${groupPrefix}${routePath}`
    const { regex, keys } = compilePath(fullPath)

    const groupMiddlewareNames = this.groupStack.flatMap((g) => g.middlewareNames)
    const groupHandlers = this.groupStack.flatMap((g) => g.handlers)
    const route = {
      method,
      routePath: fullPath,
      action,
      regex,
      keys,
      handlers: [...groupHandlers, ...handlers.flat().filter(Boolean)],
      middlewareNames: [...groupMiddlewareNames],
      name: null
    }
    this.routes.push(route)
    this.docs.push({ method, path: fullPath, action: typeof action === 'string' ? action : 'Closure' })
    return new RouteDefinition(this, route)
  }

  get(pathname, action, ...handlers) { return this.register('GET', pathname, action, ...handlers) }
  post(pathname, action, ...handlers) { return this.register('POST', pathname, action, ...handlers) }
  put(pathname, action, ...handlers) { return this.register('PUT', pathname, action, ...handlers) }
  patch(pathname, action, ...handlers) { return this.register('PATCH', pathname, action, ...handlers) }
  delete(pathname, action, ...handlers) { return this.register('DELETE', pathname, action, ...handlers) }
  use(...handlers) { this.middlewares.push(...handlers.flat()) }

  group(options, callback) {
    const opts = options || {}
    const prefix = String(opts.prefix || '')
    const middleware = Array.isArray(opts.middleware) ? opts.middleware : (opts.middleware ? [opts.middleware] : [])
    const middlewareNames = middleware.filter((m) => typeof m === 'string')
    const handlers = middleware.filter((m) => typeof m === 'function')

    this.groupStack.push({ prefix, middlewareNames, handlers })
    try {
      return callback(this)
    } finally {
      this.groupStack.pop()
    }
  }

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
  const routesDir = path.resolve(process.cwd(), 'routes')
  const files = await fs.readdir(routesDir)
  for (const file of files.filter((name) => name.endsWith('.js') && name !== 'console.js').sort()) {
    const mod = await import(pathToFileURL(path.join(routesDir, file)).href)
    if (typeof mod.default === 'function') {
      await mod.default(router, context)
    }
  }
}
