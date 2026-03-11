import { appContainer } from './runtime'

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
