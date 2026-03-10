export class Container {
  constructor() {
    this.bindings = new Map()
    this.instances = new Map()
  }

  bind(key, factory) {
    this.bindings.set(key, { factory, singleton: false })
  }

  singleton(key, factory) {
    this.bindings.set(key, { factory, singleton: true })
  }

  make(key) {
    if (this.instances.has(key)) return this.instances.get(key)
    const binding = this.bindings.get(key)
    if (!binding) throw new Error(`Service [${key}] is not bound.`)
    const value = binding.factory(this)
    if (binding.singleton) this.instances.set(key, value)
    return value
  }

  has(key) {
    return this.bindings.has(key) || this.instances.has(key)
  }
}
