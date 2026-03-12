import fsp from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { state } from './state.js'

function ANSI(color) {
  const map = { red: '\u001b[31m', green: '\u001b[32m', yellow: '\u001b[33m', gray: '\u001b[90m', reset: '\u001b[0m' }
  return map[color] || map.reset
}

function paint(color, text) {
  return `${ANSI(color)}${text}${ANSI('reset')}`
}

async function walk(dir, files = []) {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, files)
    else files.push(full)
  }
  return files
}

export async function runTests({ rootDir = 'tests' } = {}) {
  state.tests.length = 0

  const absRoot = path.resolve(process.cwd(), rootDir)
  const all = await walk(absRoot)
  const testFiles = all.filter((f) => f.endsWith('.test.js'))

  for (const file of testFiles) {
    await import(pathToFileURL(file).href)
  }

  let passed = 0
  let failed = 0
  const failures = []

  for (const t of state.tests) {
    try {
      await t.fn()
      console.log(paint('green', `✅ ${t.name}`))
      passed += 1
    } catch (error) {
      console.log(paint('red', `❌ ${t.name}`))
      console.log(paint('gray', `   ${error?.message || error}`))
      failed += 1
      failures.push({ name: t.name, error })
    }
  }

  console.log('')
  console.log(paint(failed ? 'red' : 'green', `Tests: ${passed} passed, ${failed} failed`))

  return { passed, failed, failures, files: testFiles.length }
}

