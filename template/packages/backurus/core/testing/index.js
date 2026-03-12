import { expect } from './expect.js'
import { http } from './http.js'
import { test } from './state.js'

export { test, expect, http }

export function installTestingGlobals() {
  globalThis.test = test
  globalThis.expect = expect
  globalThis.http = http()
}

