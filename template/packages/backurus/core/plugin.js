import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export async function loadPlugins(context) {
  const pluginsDir = path.resolve(process.cwd(), 'plugins')
  const entries = await fs.readdir(pluginsDir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const pluginFile = path.join(pluginsDir, entry.name, 'index.js')
    try {
      const mod = await import(pathToFileURL(pluginFile).href)
      if (typeof mod.default === 'function') {
        await mod.default(context)
      }
    } catch {
      // Ignore incomplete plugins during development.
    }
  }
}
