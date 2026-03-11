export function attachMacroSystem(factoryFn, WrapperClass, { transformResult = null } = {}) {
  const macros = new Map()

  factoryFn.macro = (name, fn) => {
    if (!name || typeof name !== 'string') throw new Error('Macro name must be a string')
    if (typeof fn !== 'function') throw new Error('Macro must be a function')
    macros.set(name, fn)

    // Instance method that proxies to the registered macro.
    WrapperClass.prototype[name] = function (...args) {
      const result = fn.call(this, this.value(), ...args)
      if (transformResult) return transformResult(this, result)
      return result
    }

    return factoryFn
  }

  factoryFn.hasMacro = (name) => macros.has(name)
  factoryFn.macros = () => Object.fromEntries(macros.entries())
  return factoryFn
}

