import { appContainer } from './runtime'

function service(name) {
  return appContainer.make(name)
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
  put(key, value, ttlMs = null) {
    return service('cache').put(key, value, ttlMs)
  },
  get(key, fallback = null) {
    return service('cache').get(key, fallback)
  },
  forget(key) {
    return service('cache').forget(key)
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
