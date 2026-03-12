export const state = {
  tests: []
}

export function test(name, fn) {
  if (!name || typeof name !== 'string') throw new Error('test(name, fn) requires a test name')
  if (typeof fn !== 'function') throw new Error('test(name, fn) requires a function')
  state.tests.push({ name, fn })
}

