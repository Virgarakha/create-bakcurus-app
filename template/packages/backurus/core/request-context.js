import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

export function runWithRequestContext({ req = null, res = null } = {}, fn) {
  const context = { req, res }
  return storage.run(context, fn)
}

export function getRequestContext() {
  return storage.getStore() || null
}

