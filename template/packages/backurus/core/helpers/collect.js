import { attachMacroSystem } from './macro.js'

export class Collection {
  constructor(input = []) {
    this._items = Collection._normalize(input)
  }

  static _normalize(input) {
    if (!input) return []
    if (input instanceof Collection) return input.all()
    if (Array.isArray(input)) return input.slice()
    if (input instanceof Map) return Array.from(input.values())
    if (typeof input === 'object') return Object.values(input)
    return [input]
  }

  value() {
    return this._items
  }

  all() {
    return this._items.slice()
  }

  count() {
    return this._items.length
  }

  isEmpty() {
    return this._items.length === 0
  }

  first(fallback = null) {
    return this._items.length ? this._items[0] : fallback
  }

  last(fallback = null) {
    return this._items.length ? this._items[this._items.length - 1] : fallback
  }

  map(callback) {
    this._items = this._items.map(callback)
    return this
  }

  filter(callback) {
    this._items = this._items.filter(callback)
    return this
  }

  pluck(key) {
    this._items = this._items.map((item) => item?.[key])
    return this
  }

  unique(by = null) {
    const getKey = (() => {
      if (!by) return (item) => item
      if (typeof by === 'function') return by
      return (item) => item?.[by]
    })()

    const seen = new Set()
    const out = []
    for (const item of this._items) {
      const key = getKey(item)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
    this._items = out
    return this
  }

  values() {
    // In JS arrays already use numeric indexes, but this mirrors Laravel's intent.
    this._items = Array.from(this._items)
    return this
  }

  toJSON() {
    return this.all()
  }
}

export function collect(input) {
  return new Collection(input)
}

attachMacroSystem(collect, Collection, {
  transformResult(instance, result) {
    // If a macro returns an array, continue as a collection; if it returns undefined, keep chaining.
    if (result === undefined) return instance
    if (Array.isArray(result)) {
      instance._items = result
      return instance
    }
    return result
  }
})

