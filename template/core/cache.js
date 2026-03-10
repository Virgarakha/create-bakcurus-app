export class CacheStore {
  constructor() {
    this.store = new Map()
  }

  put(key, value, ttlMs = null) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null
    this.store.set(key, { value, expiresAt })
    return value
  }

  get(key, fallback = null) {
    const item = this.store.get(key)
    if (!item) return fallback
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key)
      return fallback
    }
    return item.value
  }

  forget(key) {
    this.store.delete(key)
  }

  flush() {
    this.store.clear()
  }
}
