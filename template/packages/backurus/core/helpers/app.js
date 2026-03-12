import { appContainer } from '../runtime.js'

function requireContainer() {
  if (!appContainer) throw new Error('Backurus container is not available yet.')
  return appContainer
}

export function app(key = null) {
  const container = requireContainer()
  return key ? container.make(key) : container
}

function asFactory(value) {
  if (typeof value !== 'function') return () => value

  const protoNames = value.prototype ? Object.getOwnPropertyNames(value.prototype) : []
  const looksLikeClass = protoNames.length > 1
  if (looksLikeClass) {
    return (container) => new value(container)
  }
  return value
}

app.bind = (key, value) => requireContainer().bind(key, asFactory(value))
app.singleton = (key, value) => requireContainer().singleton(key, asFactory(value))
app.make = (key) => requireContainer().make(key)
app.has = (key) => requireContainer().has(key)

