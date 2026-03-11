import { attachMacroSystem } from './macro.js'

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export class StrBuilder {
  constructor(value = '') {
    this._value = String(value ?? '')
  }

  value() {
    return this._value
  }

  toString() {
    return this._value
  }

  trim() {
    this._value = this._value.trim()
    return this
  }

  lower() {
    this._value = this._value.toLowerCase()
    return this
  }

  upper() {
    this._value = this._value.toUpperCase()
    return this
  }

  slug() {
    this._value = slugify(this._value)
    return this
  }

  replace(search, replacement) {
    this._value = this._value.split(String(search)).join(String(replacement))
    return this
  }

  prepend(prefix) {
    this._value = `${String(prefix)}${this._value}`
    return this
  }

  append(suffix) {
    this._value = `${this._value}${String(suffix)}`
    return this
  }
}

export function str(value) {
  return new StrBuilder(value)
}

attachMacroSystem(str, StrBuilder, {
  transformResult(instance, result) {
    if (result === undefined) return instance
    if (typeof result === 'string') {
      instance._value = result
      return instance
    }
    return result
  }
})

