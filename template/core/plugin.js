import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginsDir = path.resolve(__dirname, '../plugins')

export async function loadPlugins(context) {
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
