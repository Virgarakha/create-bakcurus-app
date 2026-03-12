import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { MigrationError } from './errors/HttpError.js'

function isMissingMigrationFile(error, filePath) {
  if (!error) return false
  if (error.code !== 'ERR_MODULE_NOT_FOUND') return false
  const message = String(error.message || '')
  return message.includes(String(filePath))
}

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
      const filePath = path.join(this.migrationsDir, item.name)
      try {
        const mod = await import(pathToFileURL(filePath).href)
        await mod.default.down(this.db.schema)
        await this.db.run('DELETE FROM migrations WHERE name = ?', [item.name])
        console.log(`Rolled back: ${item.name}`)
      } catch (error) {
        // If the migration file is missing (deleted/renamed), we can't run `down()`.
        // Best-effort: remove the record so teams can proceed, but warn that DB state may be stale.
        if (isMissingMigrationFile(error, filePath)) {
          console.warn(`Warning: migration file is missing, skipping down(): ${item.name}`)
          await this.db.run('DELETE FROM migrations WHERE name = ?', [item.name])
          continue
        }
        throw new MigrationError('Rollback failed', { file: filePath, operation: 'down', cause: error })
      }
    }
  }

  async reset() {
    while ((await this.applied()).length) {
      await this.rollback()
    }
  }

  async fresh() {
    // Drop all tables except migrations so orphan tables from failed migrations won't break reruns.
    if (this.db.clientName === 'mysql') {
      const tables = await this.db.all(
        `SELECT table_name AS name
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
           AND table_type = 'BASE TABLE'`
      )
      const toDrop = (tables || [])
        .map((t) => t.name)
        .filter((name) => name && name !== 'migrations')

      if (toDrop.length) {
        await this.db.run('SET FOREIGN_KEY_CHECKS=0')
        for (const name of toDrop) {
          await this.db.run(`DROP TABLE IF EXISTS \`${name}\``)
        }
        await this.db.run('SET FOREIGN_KEY_CHECKS=1')
      }

      await this.db.run('DELETE FROM migrations')
      return this.migrate()
    }

    // SQLite
    const rows = await this.db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    const toDrop = (rows || [])
      .map((r) => r.name)
      .filter((name) => name && name !== 'migrations')
    for (const name of toDrop) {
      await this.db.run(`DROP TABLE IF EXISTS ${name}`)
    }
    await this.db.run('DELETE FROM migrations')
    return this.migrate()
  }
}
