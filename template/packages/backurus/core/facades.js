import { appContainer } from './runtime'
import { getRequestContext } from './request-context.js'

function service(name) {
  return appContainer.make(name)
}

async function maybeAwait(value) {
  return value && typeof value.then === 'function' ? await value : value
}

export const DB = {
  table(table) {
    return {
      where(column, operator, value) {
        const state = { where: [] }
        if (arguments.length === 2) {
          value = operator
          operator = '='
        }
        state.where.push({ column, operator, value })
        return {
          async first() {
            const clauses = state.where.map((item) => `${item.column} ${item.operator} ?`).join(' AND ')
            const params = state.where.map((item) => item.value)
            return service('db').get(`SELECT * FROM ${table} WHERE ${clauses} LIMIT 1`, params)
          },
          async get() {
            const clauses = state.where.map((item) => `${item.column} ${item.operator} ?`).join(' AND ')
            const params = state.where.map((item) => item.value)
            return service('db').all(`SELECT * FROM ${table} WHERE ${clauses}`, params)
          }
        }
      }
    }
  }
}

export const Cache = {
  // Back-compat aliases
  put(key, value, ttlMs = null) { return service('cache').put(key, value, ttlMs) },
  forget(key) { return service('cache').forget(key) },

  // Fluent facade API
  async set(key, value, ttlSeconds = null) {
    const ttlMs = ttlSeconds ? Number(ttlSeconds) * 1000 : null
    return maybeAwait(service('cache').put(key, value, ttlMs))
  },
  async get(key, fallback = null) { return maybeAwait(service('cache').get(key, fallback)) },
  async delete(key) { return maybeAwait(service('cache').forget(key)) },
  async flush() { return maybeAwait(service('cache').flush()) },
  async remember(key, ttlSeconds, factory, fallback = null) {
    const existing = await Cache.get(key, fallback)
    if (existing !== fallback) return existing
    const value = await factory()
    await Cache.set(key, value, ttlSeconds)
    return value
  }
}

export const Event = {
  listen(name, handler) {
    return service('events').listen(name, handler)
  },
  emit(name, payload = null) {
    return service('events').emit(name, payload)
  }
}

export const Queue = {
  dispatch(job) {
    return service('queue').dispatch(job)
  },
  dispatchLater(job, delayMs) {
    return service('queue').dispatchLater(job, delayMs)
  }
}

export const Log = {
  info(message, context = null) {
    return service('log').info(message, context)
  },
  warn(message, context = null) {
    return service('log').warn(message, context)
  },
  error(message, context = null) {
    return service('log').error(message, context)
  }
}

export const Gate = {
  define(name, callback) {
    return service('gate').define(name, callback)
  },
  allows(name, ...args) {
    return service('gate').allows(name, ...args)
  },
  authorize(name, ...args) {
    return service('gate').authorize(name, ...args)
  }
}

export const Storage = {
  disk(name = null) {
    return service('storage').disk(name)
  }
}

function bearerTokenFromHeaders(headers) {
  const authHeader = headers?.authorization || headers?.Authorization
  if (!authHeader) return null
  const value = String(authHeader)
  if (!value.toLowerCase().startsWith('bearer ')) return null
  const token = value.slice(7).trim()
  return token || null
}

function revokedTokenKey(token) {
  return `auth:revoked:${token}`
}

function parseJwtExpiresInToSeconds(expiresIn) {
  if (expiresIn === null || expiresIn === undefined) return null
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) return Math.max(expiresIn, 1)
  const raw = String(expiresIn).trim()
  if (!raw) return null
  if (/^\d+$/.test(raw)) return Math.max(Number(raw), 1)
  const match = raw.match(/^(\d+)\s*([smhd])$/i)
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  const multipliers = { s: 1, m: 60, h: 60 * 60, d: 60 * 60 * 24 }
  return Math.max(amount * (multipliers[unit] || 1), 1)
}

function inferTokenTtlSeconds(req) {
  const exp = req?.auth?.payload?.exp
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Number.isFinite(exp)) return Math.max(exp - nowSeconds, 1)
  try {
    const config = service('config')
    return parseJwtExpiresInToSeconds(config?.auth?.jwtExpiresIn) || 60 * 60 * 24 * 7
  } catch {
    return 60 * 60 * 24 * 7
  }
}

export const Auth = {
  token() {
    const ctx = getRequestContext()
    const req = ctx?.req
    const token = req?.token || bearerTokenFromHeaders(req?.headers) || null

    // String-like token object, so developers can do: `await Auth.token().delete()`
    const tokenString = token || ''
    const out = new String(tokenString)
    out.value = () => token
    out.exists = () => !!token
    out.delete = async () => {
      if (!token) return false
      const ttlSeconds = inferTokenTtlSeconds(req)
      await Cache.set(revokedTokenKey(token), true, ttlSeconds)
      return true
    }
    return out
  },

  user() {
    const ctx = getRequestContext()
    return ctx?.req?.user || null
  },

  id() {
    const user = Auth.user()
    return user?.id ?? null
  },

  check() {
    return !!Auth.user()
  },

  guest() {
    return !Auth.check()
  }
}
