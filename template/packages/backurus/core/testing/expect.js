function deepEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== typeof b) return false
  if (!a || !b) return false
  if (typeof a !== 'object') return false

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!deepEqual(a[key], b[key])) return false
  }
  return true
}

export function expect(received) {
  return {
    toBe(expected) {
      if (!Object.is(received, expected)) {
        throw new Error(`Expected ${JSON.stringify(received)} to be ${JSON.stringify(expected)}`)
      }
    },
    toEqual(expected) {
      if (!deepEqual(received, expected)) {
        throw new Error(`Expected ${JSON.stringify(received)} to equal ${JSON.stringify(expected)}`)
      }
    },
    toContain(expected) {
      if (typeof received === 'string') {
        if (!received.includes(String(expected))) throw new Error(`Expected string to contain ${JSON.stringify(expected)}`)
        return
      }
      if (Array.isArray(received)) {
        if (!received.includes(expected)) throw new Error(`Expected array to contain ${JSON.stringify(expected)}`)
        return
      }
      throw new Error('toContain supports strings and arrays only')
    },
    toBeTruthy() {
      if (!received) throw new Error(`Expected ${JSON.stringify(received)} to be truthy`)
    },
    toBeFalsy() {
      if (received) throw new Error(`Expected ${JSON.stringify(received)} to be falsy`)
    }
  }
}

