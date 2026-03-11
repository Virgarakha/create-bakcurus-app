import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function listModuleDirs(baseDir) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => [])
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()
}

async function loadOptional(filePath) {
  try {
    const mod = await import(pathToFileURL(filePath).href)
    return mod?.default || null
  } catch {
    return null
  }
}

export async function loadModules(router, context) {
  const roots = [
    path.resolve(process.cwd(), 'modules'),
    path.resolve(process.cwd(), 'app/modules')
  ]

  const loaded = []

  for (const root of roots) {
    const moduleNames = await listModuleDirs(root)
    for (const name of moduleNames) {
      const base = path.join(root, name)

      // Optional: register bindings/services.
      const register = await loadOptional(path.join(base, 'register.js'))
      if (typeof register === 'function') {
        await register(context)
      }

      // Optional: module routes.
      const routes = await loadOptional(path.join(base, 'routes.js'))
      if (typeof routes === 'function') {
        await routes(router, context)
      }

      loaded.push({ root, name })
    }
  }

  return loaded
}

