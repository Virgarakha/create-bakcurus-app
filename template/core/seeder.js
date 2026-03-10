import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export class Seeder {
  constructor(container, config) {
    this.container = container
    this.seedersDir = path.resolve(process.cwd(), config.database.seeders)
  }

  async run(name = null) {
    const files = (await fs.readdir(this.seedersDir).catch(() => [])).filter((file) => file.endsWith('.js')).sort()
    for (const file of files) {
      if (name && file !== `${name}.js`) continue
      const mod = await import(pathToFileURL(path.join(this.seedersDir, file)).href)
      if (typeof mod.default?.run === 'function') {
        await mod.default.run(this.container)
        console.log(`Seeded: ${file}`)
      }
    }
  }
}
