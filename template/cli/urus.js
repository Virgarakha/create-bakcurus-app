#!/usr/bin/env node
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import dotenv from 'dotenv'
import chokidar from 'chokidar'
import { createApp } from '../bootstrap/app.js'
import { Migrator } from '../core/migrator.js'
import { Seeder } from '../core/seeder.js'
import { loadConfig } from '../core/config.js'
import { Router, loadRoutes } from '../core/router.js'
import { registerDocsRoute } from '../core/swagger.js'

dotenv.config()

const [, , command, name] = process.argv
const cacheFile = path.resolve(process.cwd(), 'storage/framework/cache/config.json')

function timestamp() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

async function ensureFile(filePath, content) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true })
  await fsp.writeFile(filePath, content, 'utf8')
  console.log(`Created: ${path.relative(process.cwd(), filePath)}`)
}

function className(rawName) {
  const base = rawName.replace(/\.js$/, '')
  return base[0].toUpperCase() + base.slice(1)
}

function templates(kind, rawName) {
  const name = className(rawName)
  const tableName = rawName.toLowerCase().endsWith('s') ? rawName.toLowerCase() : `${rawName.toLowerCase()}s`
  const map = {
    controller: { dir: 'app/controllers', file: `${name}.js`, content: `export default class ${name} {\n  async index(req, res) {\n    return res.success([])\n  }\n}\n` },
    model: { dir: 'app/models', file: `${name}.js`, content: `import Model from '../../core/model'\n\nexport default class ${name} extends Model {\n  static table = '${tableName}'\n}\n` },
    migration: { dir: 'database/migrations', file: `${timestamp()}_${rawName}.js`, content: `export default {\n  async up(schema) {\n    await schema.create('${rawName.replace(/^create_|_table$/g, '')}', (table) => {\n      table.id()\n      table.timestamps()\n    })\n  },\n\n  async down(schema) {\n    await schema.drop('${rawName.replace(/^create_|_table$/g, '')}')\n  }\n}\n` },
    middleware: { dir: 'app/middleware', file: `${name}.js`, content: `export default async function ${name}(req, res, next) {\n  return next()\n}\n` },
    request: { dir: 'app/requests', file: `${name}.js`, content: `export default class ${name} {\n  rules() {\n    return {}\n  }\n}\n` },
    job: { dir: 'app/jobs', file: `${name}.js`, content: `export default class ${name} {\n  constructor(payload = {}) {\n    Object.assign(this, payload)\n  }\n}\n` },
    event: { dir: 'app/events', file: `${name}.js`, content: `export default class ${name} {\n  constructor(payload = {}) {\n    Object.assign(this, payload)\n  }\n}\n` },
    seeder: { dir: 'database/seeders', file: `${name}.js`, content: `export default {\n  async run() {}\n}\n` },
    policy: { dir: 'app/policies', file: `${name}.js`, content: `export default class ${name} {\n  update(user, model) {\n    return user.id === model.user_id\n  }\n}\n` },
    resource: { dir: 'app/resources', file: `${name}.js`, content: `import { Resource } from '../../core/resource'\n\nexport default class ${name} extends Resource {\n  toJSON() {\n    return this.resource\n  }\n}\n` }
  }
  return map[kind]
}

async function make(kind, rawName) {
  if (!rawName) throw new Error(`Missing name for make:${kind}`)
  const target = templates(kind, rawName)
  if (!target) throw new Error(`Unknown make target: ${kind}`)
  await ensureFile(path.resolve(process.cwd(), target.dir, target.file), target.content)
}

async function makeModule(rawName) {
  const name = className(rawName)
  const base = path.resolve(process.cwd(), 'app/modules', name)
  for (const dir of ['controllers', 'models', 'requests', 'services']) {
    await fsp.mkdir(path.join(base, dir), { recursive: true })
  }
  await ensureFile(path.join(base, 'module.js'), `export default { name: '${name}' }\n`)
}

async function routeList() {
  const config = loadConfig()
  const router = new Router({ config })
  router.aliasMiddleware('auth', async (req, res, next) => next())
  await loadRoutes(router, { config, container: null, events: null, queue: null, ws: null })
  registerDocsRoute(router)
  const rows = router.list()
  console.log('METHOD   URI                     ACTION                         NAME')
  console.log('--------------------------------------------------------------------------')
  for (const row of rows) {
    console.log(`${row.method.padEnd(8)} ${row.uri.padEnd(22)} ${row.action.padEnd(30)} ${row.name}`)
  }
}

async function withApp(callback) {
  const app = await createApp()
  try {
    await callback(app)
  } finally {
    await app.db.close()
  }
}

function startServe() {
  let child = null
  let watcher = null
  let shuttingDown = false

  const stopChild = (signal = 'SIGTERM') => {
    if (!child || child.killed) return
    child.kill(signal)
  }

  const cleanup = async (signal = null) => {
    if (shuttingDown) return
    shuttingDown = true

    if (watcher) {
      await watcher.close().catch(() => {})
    }

    stopChild(signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM')

    if (signal) {
      process.exit(0)
    }
  }

  const spawnServer = () => {
    stopChild('SIGTERM')
    child = spawn(process.execPath, ['index.js'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    })
    child.on('exit', () => {
      child = null
    })
  }

  spawnServer()
  watcher = chokidar.watch(['app', 'bootstrap', 'config', 'core', 'database', 'routes', 'plugins', 'index.js'], {
    ignoreInitial: true
  })
  watcher.on('all', () => spawnServer())

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    process.on(signal, () => {
      cleanup(signal)
    })
  }

  process.on('exit', () => stopChild('SIGTERM'))
  process.on('uncaughtException', async (error) => {
    console.error(error.stack || error.message)
    await cleanup('SIGTERM')
  })
  process.on('unhandledRejection', async (error) => {
    console.error(error?.stack || error?.message || error)
    await cleanup('SIGTERM')
  })
}

async function configCache() {
  const config = loadConfig()
  await fsp.mkdir(path.dirname(cacheFile), { recursive: true })
  await fsp.writeFile(cacheFile, JSON.stringify(config, null, 2), 'utf8')
  console.log('Configuration cached successfully.')
}

async function configClear() {
  if (fs.existsSync(cacheFile)) await fsp.unlink(cacheFile)
  console.log('Configuration cache cleared.')
}

async function queueRestart() {
  const file = path.resolve(process.cwd(), 'storage/framework/cache/queue-restart.json')
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, JSON.stringify({ restartedAt: new Date().toISOString() }, null, 2), 'utf8')
  console.log('Queue restart signal written.')
}

async function storageLink() {
  const target = path.resolve(process.cwd(), 'storage/app/public')
  const link = path.resolve(process.cwd(), 'public/storage')
  await fsp.mkdir(target, { recursive: true })
  await fsp.mkdir(path.dirname(link), { recursive: true })

  try {
    const stat = await fsp.lstat(link)
    if (stat.isSymbolicLink()) {
      console.log('The [public/storage] link already exists.')
      return
    }
    throw new Error('Path [public/storage] already exists and is not a symbolic link.')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const relativeTarget = path.relative(path.dirname(link), target)
  await fsp.symlink(relativeTarget, link, process.platform === 'win32' ? 'junction' : 'dir')
  console.log('The [public/storage] link has been connected to [storage/app/public].')
}

async function migrateStatus(app) {
  const migrator = new Migrator(app.db, app.config)
  const files = await migrator.files()
  const applied = new Set((await migrator.applied()).map((item) => item.name))
  console.log('STATUS   MIGRATION')
  console.log('-------------------------------')
  for (const file of files) {
    console.log(`${(applied.has(file) ? 'YES' : 'NO').padEnd(8)} ${file}`)
  }
}

async function main() {
  switch (command) {
    case 'make:controller': return make('controller', name)
    case 'make:model': return make('model', name)
    case 'make:migration': return make('migration', name)
    case 'make:middleware': return make('middleware', name)
    case 'make:request': return make('request', name)
    case 'make:job': return make('job', name)
    case 'make:event': return make('event', name)
    case 'make:seeder': return make('seeder', name)
    case 'make:policy': return make('policy', name)
    case 'make:resource': return make('resource', name)
    case 'make:module': return makeModule(name)
    case 'config:cache': return configCache()
    case 'config:clear': return configClear()
    case 'storage:link': return storageLink()
    case 'serve': return startServe()
    case 'route:list': return routeList()
  }

  return withApp(async (app) => {
    const migrator = new Migrator(app.db, app.config)
    const seeder = new Seeder(app.container, app.config)

    switch (command) {
      case 'migrate': return migrator.migrate()
      case 'migrate:rollback': return migrator.rollback()
      case 'migrate:reset': return migrator.reset()
      case 'migrate:fresh':
        await migrator.reset()
        return migrator.migrate()
      case 'migrate:status': return migrateStatus(app)
      case 'db:seed': return seeder.run(name || null)
      case 'queue:work': return app.queue.work()
      case 'queue:restart': return queueRestart()
      case 'schedule:run': return app.container.make('scheduler').runAll()
      default:
        console.log(`Backurus CLI\n\nCommands:\n- make:controller\n- make:model\n- make:migration\n- make:middleware\n- make:request\n- make:job\n- make:event\n- make:seeder\n- make:policy\n- make:resource\n- make:module\n- migrate\n- migrate:rollback\n- migrate:reset\n- migrate:fresh\n- migrate:status\n- db:seed\n- route:list\n- queue:work\n- queue:restart\n- schedule:run\n- serve\n- storage:link\n- config:cache\n- config:clear`)
    }
  })
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
