import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { MigrationError } from './errors/HttpError.js'

export class Migrator {
  constructor(db, config) {
    this.db = db
    this.config = config
    this.migrationsDir = path.resolve(process.cwd(), config.database.migrations)
  }

  async files() {
    const entries = await fs.readdir(this.migrationsDir).catch(() => [])
    return entries.filter((file) => file.endsWith('.js')).sort()
  }

  async applied() {
    return this.db.all('SELECT * FROM migrations ORDER BY id ASC')
  }

  async migrate() {
    const files = await this.files()
    const appliedItems = await this.applied()
    const applied = new Set(appliedItems.map((item) => item.name))
    const batch = (appliedItems.at(-1)?.batch || 0) + 1
    for (const file of files) {
      if (applied.has(file)) continue
      try {
        const mod = await import(pathToFileURL(path.join(this.migrationsDir, file)).href)
        await mod.default.up(this.db.schema)
        await this.db.run('INSERT INTO migrations (name, batch, created_at) VALUES (?, ?, ?)', [file, batch, this.db.formatDate()])
        console.log(`Migrated: ${file}`)
      } catch (error) {
        throw new MigrationError('Migration failed', { file: path.join(this.migrationsDir, file), operation: 'up', cause: error })
      }
    }
  }

  async rollback() {
    const applied = await this.applied()
    const batch = applied.at(-1)?.batch
    if (!batch) return
    const rollbackItems = applied.filter((item) => item.batch === batch).reverse()
    for (const item of rollbackItems) {
      try {
        const mod = await import(pathToFileURL(path.join(this.migrationsDir, item.name)).href)
        await mod.default.down(this.db.schema)
        await this.db.run('DELETE FROM migrations WHERE name = ?', [item.name])
        console.log(`Rolled back: ${item.name}`)
      } catch (error) {
        throw new MigrationError('Rollback failed', { file: path.join(this.migrationsDir, item.name), operation: 'down', cause: error })
      }
    }
  }

  async reset() {
    while ((await this.applied()).length) {
      await this.rollback()
    }
  }
}
