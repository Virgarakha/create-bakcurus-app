#!/usr/bin/env node
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import dotenv from 'dotenv'
import chokidar from 'chokidar'
import { createApp } from '../bootstrap/app.js'
import { Migrator } from '../core/migrator.js'
import { Seeder } from '../core/seeder.js'
import { loadConfig } from '../core/config.js'
import { Router, loadRoutes } from '../core/router.js'
import { registerDocsRoute, createSpec } from '../core/swagger.js'
import { loadModules } from '../core/modules.js'
import { formatCliError } from '../core/errors/Handler.js'
import { installTestingGlobals } from '../core/testing/index.js'
import { runTests } from '../core/testing/runner.js'

dotenv.config()

const [, , command, name] = process.argv
const cacheFile = path.resolve(process.cwd(), 'storage/framework/cache/config.json')
const registerFile = pathToFileURL(path.resolve(process.cwd(), 'backurus-register.mjs')).href

const ANSI = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  green: '\u001b[32m',
  blue: '\u001b[34m',
  gray: '\u001b[90m',
  bold: '\u001b[1m'
}

function paint(color, text) {
  return `${color}${text}${ANSI.reset}`
}

const icons = {
  dino: '🦖',
  rocket: '🚀',
  box: '📦',
  folder: '📂',
  db: '🗄',
  routes: '📡',
  plugin: '🧩',
  module: '📦',
  watch: '👀',
  restart: '🔄',
  ok: '✅',
  warn: '⚠️',
  err: '❌',
  globe: '🌍',
  book: '📚',
  bolt: '⚡'
}

function banner() {
  console.log(paint(ANSI.bold, `${icons.dino} Backurus Development Server`))
  console.log(paint(ANSI.gray, 'Backurus — Modern Backend Framework for Node.js'))
  console.log('')
}

function logInfo(message) {
  console.log(paint(ANSI.blue, message))
}

function logDim(message) {
  console.log(paint(ANSI.gray, message))
}

function logSuccess(message) {
  console.log(paint(ANSI.green, message))
}

function logWarn(message) {
  console.log(paint(ANSI.yellow, message))
}

function logError(message) {
  console.log(paint(ANSI.red, message))
}

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
    service: { dir: 'app/services', file: `${name}.js`, content: `export default class ${name} {\n  constructor(container = null) {\n    this.container = container\n  }\n}\n` },
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
  const slug = name.toLowerCase()
  const base = path.resolve(process.cwd(), 'modules', slug)
  for (const dir of ['controllers', 'services', 'models', 'validators', 'policies']) {
    await fsp.mkdir(path.join(base, dir), { recursive: true })
  }
  await ensureFile(path.join(base, 'module.js'), `export default { name: '${name}', slug: '${slug}' }\n`)
  await ensureFile(path.join(base, 'routes.js'), `export default async function routes(Route, ctx) {\n  // Example:\n  // Route.group({ prefix: '/api/v1/${slug}' }, (Route) => {\n  //   Route.get('/', async (req, res) => res.success([])).name('${slug}.index')\n  // })\n}\n`)
  await ensureFile(path.join(base, 'register.js'), `export default async function register({ container }) {\n  // Bind module services here.\n  // Example:\n  // container.singleton('${slug}.service', () => new ${name}Service(container))\n}\n`)
}

async function routeList() {
  const config = loadConfig()
  const router = new Router({ config })
  router.aliasMiddleware('auth', async (req, res, next) => next())
  await loadModules(router, { config, container: null, events: null, queue: null, server: null, ws: null })
  await loadRoutes(router, { config, container: null, events: null, queue: null, ws: null })
  registerDocsRoute(router)
  const rows = router.list()
  console.log('METHOD   URI                     ACTION                         NAME')
  console.log('--------------------------------------------------------------------------')
  for (const row of rows) {
    console.log(`${row.method.padEnd(8)} ${row.uri.padEnd(22)} ${row.action.padEnd(30)} ${row.name}`)
  }
}

async function serveSummary() {
  const config = loadConfig()
  const url = config?.app?.url || `http://127.0.0.1:${config?.app?.port || 3000}`
  const env = config?.app?.env || 'development'

  const router = new Router({ config })
  router.aliasMiddleware('auth', async (req, res, next) => next())
  await loadModules(router, { config, container: null, events: null, queue: null, server: null, ws: null })
  await loadRoutes(router, { config, container: null, events: null, queue: null, ws: null })
  registerDocsRoute(router)
  const routesLoaded = router.routes.length

  const pluginsDir = path.resolve(process.cwd(), 'plugins')
  const pluginEntries = await fsp.readdir(pluginsDir, { withFileTypes: true }).catch(() => [])
  const pluginsLoaded = (await Promise.all(pluginEntries.filter((e) => e.isDirectory()).map(async (entry) => {
    const pluginFile = path.join(pluginsDir, entry.name, 'index.js')
    try {
      await fsp.access(pluginFile)
      return true
    } catch {
      return false
    }
  }))).filter(Boolean).length

  const moduleRoots = [path.resolve(process.cwd(), 'modules'), path.resolve(process.cwd(), 'app/modules')]
  const moduleCounts = await Promise.all(moduleRoots.map(async (modulesDir) => {
    const moduleEntries = await fsp.readdir(modulesDir, { withFileTypes: true }).catch(() => [])
    const count = (await Promise.all(moduleEntries.filter((e) => e.isDirectory()).map(async (entry) => {
      const moduleFile = path.join(modulesDir, entry.name, 'module.js')
      try {
        await fsp.access(moduleFile)
        return true
      } catch {
        return false
      }
    }))).filter(Boolean).length
    return count
  }))
  const modulesLoaded = moduleCounts.reduce((a, b) => a + b, 0)

  return { config, url, env, routesLoaded, pluginsLoaded, modulesLoaded }
}

async function docsGenerate() {
  const config = loadConfig()
  const router = new Router({ config })
  router.aliasMiddleware('auth', async (req, res, next) => next())
  await loadModules(router, { config, container: null, events: null, queue: null, server: null, ws: null })
  await loadRoutes(router, { config, container: null, events: null, queue: null, ws: null })
  registerDocsRoute(router)
  const spec = createSpec(router)

  const outDir = path.resolve(process.cwd(), 'storage/docs')
  await fsp.mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, 'openapi.json')
  await fsp.writeFile(outFile, JSON.stringify(spec, null, 2), 'utf8')
  console.log(`Generated: ${path.relative(process.cwd(), outFile)}`)
}

async function withApp(callback) {
  const app = await createApp()
  try {
    await callback(app)
  } finally {
    await app.db.close()
  }
}

async function startServe() {
  let child = null
  let watcher = null
  let shuttingDown = false
  let serverReady = false
  let lastStderr = ''
  let restartTimer = null
  let restarting = false
  let pendingRestart = null
  let intentionallyStopping = false
  let readyResolve = null
  let exitResolve = null

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  async function stopChildGracefully(signal = 'SIGTERM') {
    if (!child || child.killed) return
    intentionallyStopping = true

    const childRef = child
    const exitPromise = new Promise((resolve) => {
      childRef.once('exit', () => resolve())
    })

    try {
      childRef.kill(signal)
    } catch {
      // Ignore kill errors if process already exited.
    }

    // Escalate if it doesn't exit in time.
    const timeout = setTimeout(() => {
      try {
        if (!childRef.killed) childRef.kill('SIGKILL')
      } catch {
        // Ignore.
      }
    }, 2500)

    await exitPromise.finally(() => clearTimeout(timeout))
    intentionallyStopping = false
  }

  const cleanup = async (signal = null) => {
    if (shuttingDown) return
    shuttingDown = true

    if (watcher) {
      await watcher.close().catch(() => {})
    }

    await stopChildGracefully(signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM')

    if (signal) {
      process.exit(0)
    }
  }

  banner()
  logInfo(`${icons.rocket} Starting server...`)
  console.log('')

  let summary = null
  try {
    logDim(`${icons.box} Loading configuration...`)
    summary = await serveSummary()
    logDim(`${icons.folder} Loading routes...`)
    logDim(`${icons.db} Connecting database...`)
  } catch (error) {
    logWarn(`${icons.warn} Preflight checks failed (continuing anyway).`)
    logDim(formatCliError(error, { context: 'Serve preflight' }))
  }

  if (summary) {
    logDim(`${icons.routes} Routes loaded: ${summary.routesLoaded}`)
    logDim(`${icons.plugin} Plugins loaded: ${summary.pluginsLoaded}`)
    logDim(`${icons.module} Modules loaded: ${summary.modulesLoaded}`)
    console.log('')
  }

  const printReady = () => {
    if (serverReady) return
    serverReady = true
    if (typeof readyResolve === 'function') {
      readyResolve()
      readyResolve = null
    }
    logSuccess(`${icons.ok} Server running!`)
    console.log('')
    if (summary?.url) logInfo(`URL: ${summary.url}`)
    if (summary?.url) logInfo(`Docs: ${summary.url.replace(/\/$/, '')}/docs`)
    if (summary?.env) logInfo(`${icons.bolt} Environment: ${summary.env}`)
    console.log('')
    logDim(`${icons.watch} Watching files for changes...`)
    console.log('')
    logDim('Press CTRL+C to stop the server.')
  }

  const printServeError = (rawText) => {
    const text = String(rawText || '')
    logError(`${icons.err} Server Error`)
    console.log('')
    if (text.trim()) {
      const messageLine = text.split('\n').find((line) => line.trim()) || ''
      logError(`Message: ${messageLine.trim()}`)
    }
    const suggestion = (() => {
      if (text.includes('EADDRINUSE')) return 'Try using another port in your .env file (APP_PORT), or stop the process using that port.'
      if (text.includes('EACCES')) return 'Try using a port above 1024, or adjust permissions.'
      if (text.includes('ECONNREFUSED') || text.includes('connect ECONNREFUSED')) return 'Check your database/redis service is running and credentials in .env are correct.'
      return null
    })()
    if (suggestion) {
      console.log('')
      logWarn('Suggestion:')
      console.log(suggestion)
    }
  }

  const pipeLines = (stream, onLine) => {
    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      let index = buffer.indexOf('\n')
      while (index !== -1) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        onLine(line.replace(/\r$/, ''))
        index = buffer.indexOf('\n')
      }
    })
  }

  const spawnServer = () => {
    serverReady = false
    lastStderr = ''
    readyResolve = null
    exitResolve = null

    const readyPromise = new Promise((resolve) => { readyResolve = resolve })
    const exitPromise = new Promise((resolve) => { exitResolve = resolve })

    child = spawn(process.execPath, ['--import', registerFile, 'index.js'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: process.env
    })

    pipeLines(child.stdout, (line) => {
      if (!line.trim()) return
      if (line.includes('listening on port')) {
        printReady()
        return
      }
      console.log(paint(ANSI.gray, `› ${line}`))
    })

    pipeLines(child.stderr, (line) => {
      if (!line.trim()) return
      lastStderr = `${lastStderr}\n${line}`.trim()
      console.log(paint(ANSI.red, `✖ ${line}`))
    })

    child.on('exit', (code, signal) => {
      if (typeof exitResolve === 'function') {
        exitResolve({ code, signal })
        exitResolve = null
      }

      if (!shuttingDown && !intentionallyStopping && !serverReady) {
        console.log('')
        printServeError(lastStderr)
      }
      child = null
    })

    return { readyPromise, exitPromise }
  }

  const spawnServerWithWait = async (maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const { readyPromise, exitPromise } = spawnServer()
      const result = await Promise.race([
        readyPromise.then(() => ({ type: 'ready' })),
        exitPromise.then((exit) => ({ type: 'exit', exit }))
      ])

      if (result.type === 'ready') return true

      const stderr = String(lastStderr || '')
      if (stderr.includes('EADDRINUSE') && attempt < maxRetries && !shuttingDown) {
        console.log('')
        logWarn(`${icons.warn} Port is still in use. Retrying restart...`)
        await wait(250 * (attempt + 1))
        continue
      }

      return false
    }
    return false
  }

  const restartServer = async (changedFile = null) => {
    if (restarting) {
      pendingRestart = changedFile || pendingRestart
      return
    }
    restarting = true

    console.log('')
    logInfo(`${icons.restart} Changes detected${changedFile ? ` (${changedFile})` : ''}`)
    logDim('🛑 Stopping server...')
    await stopChildGracefully('SIGTERM')
    await wait(200)
    logDim('♻ Restarting server...')
    await spawnServerWithWait()

    restarting = false
    if (pendingRestart) {
      const next = pendingRestart
      pendingRestart = null
      await restartServer(next)
    }
  }

  await spawnServerWithWait()
  watcher = chokidar.watch(['app', 'bootstrap', 'config', 'core', 'database', 'routes', 'plugins', 'index.js'], {
    ignoreInitial: true
  })
  watcher.on('all', (_event, filePath) => {
    if (restartTimer) clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      const relative = filePath ? path.relative(process.cwd(), filePath) : null
      restartServer(relative)
    }, 120)
  })

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    process.on(signal, () => {
      cleanup(signal)
    })
  }

  process.on('exit', () => {
    stopChildGracefully('SIGTERM').catch(() => {})
  })
  process.on('uncaughtException', async (error) => {
    console.error(formatCliError(error, { context: `Command: serve` }))
    await cleanup('SIGTERM')
  })
  process.on('unhandledRejection', async (error) => {
    console.error(formatCliError(error, { context: `Command: serve` }))
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
    case 'make:service': return make('service', name)
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
    case 'docs:generate': return docsGenerate()
    case 'test':
      installTestingGlobals()
      return runTests()
  }

  return withApp(async (app) => {
    const migrator = new Migrator(app.db, app.config)
    const seeder = new Seeder(app.container, app.config)

    switch (command) {
      case 'migrate': return migrator.migrate()
      case 'migrate:rollback': return migrator.rollback()
      case 'migrate:reset': return migrator.reset()
      case 'migrate:fresh':
        return migrator.fresh()
      case 'migrate:status': return migrateStatus(app)
      case 'db:seed': return seeder.run(name || null)
      case 'queue:work': return app.queue.work()
      case 'queue:restart': return queueRestart()
      case 'schedule:run': return app.container.make('scheduler').runAll()
      default:
        console.log(`Backurus CLI\n\nCommands:\n- make:controller\n- make:service\n- make:model\n- make:migration\n- make:middleware\n- make:request\n- make:job\n- make:event\n- make:seeder\n- make:policy\n- make:resource\n- make:module\n- migrate\n- migrate:rollback\n- migrate:reset\n- migrate:fresh\n- migrate:status\n- db:seed\n- route:list\n- docs:generate\n- queue:work\n- queue:restart\n- schedule:run\n- serve\n- test\n- storage:link\n- config:cache\n- config:clear`)
    }
  })
}

main().catch((error) => {
  console.error(formatCliError(error, { context: command ? `Command: ${command}` : null }))
  process.exit(1)
})
