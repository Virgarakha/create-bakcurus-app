export class GateRegistry {
  constructor() {
    this.abilities = new Map()
  }

  define(name, callback) {
    this.abilities.set(name, callback)
  }

  async allows(name, ...args) {
    const ability = this.abilities.get(name)
    if (!ability) return false
    return Boolean(await ability(...args))
  }

  async authorize(name, ...args) {
    const allowed = await this.allows(name, ...args)
    if (!allowed) {
      const error = new Error('This action is unauthorized.')
      error.statusCode = 403
      throw error
    }
    return true
  }
}
