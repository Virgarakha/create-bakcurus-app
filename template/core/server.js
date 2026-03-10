import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { Router } from './router'
import { parseRequest } from './request'
import { createRateLimiter } from './rate-limiter'
import { setContainer } from './runtime'

async function runStack(stack, req, res) {
  let index = -1
  const runner = async (position) => {
    if (position <= index) throw new Error('next() called multiple times')
    index = position
    const fn = stack[position]
    if (!fn) return
    return fn(req, res, () => runner(position + 1))
  }
  return runner(0)
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolveAllowedOrigin(origin, corsConfig) {
  const configured = splitList(corsConfig.origin || '*')
  if (!configured.length || configured.includes('*')) {
    return corsConfig.credentials && origin ? origin : '*'
  }
  if (origin && configured.includes(origin)) return origin
  return configured[0] || null
}

function applyCorsHeaders(req, res, corsConfig = {}) {
  const origin = req.headers.origin
  const allowedOrigin = resolveAllowedOrigin(origin, corsConfig)
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Vary', 'Origin, Access-Control-Request-Headers')
  }

  if (corsConfig.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  const requestedHeaders = req.headers['access-control-request-headers']
  res.setHeader('Access-Control-Allow-Methods', corsConfig.methods || 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    requestedHeaders || corsConfig.headers || 'Content-Type, Authorization, X-Requested-With'
  )

  if (corsConfig.exposedHeaders) {
    res.setHeader('Access-Control-Expose-Headers', corsConfig.exposedHeaders)
  }

  if (corsConfig.maxAge) {
    res.setHeader('Access-Control-Max-Age', String(corsConfig.maxAge))
  }
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.htm': 'text/html; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
}

function contentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

async function serveStatic(req, res, publicRoot) {
  if (!['GET', 'HEAD'].includes(req.method)) return false

  const relativePath = decodeURIComponent(req.path).replace(/^\/+/, '')
  if (!relativePath) return false

  const absolutePath = path.resolve(publicRoot, relativePath)
  if (absolutePath !== publicRoot && !absolutePath.startsWith(`${publicRoot}${path.sep}`)) return false

  try {
    const stat = await fsp.stat(absolutePath)
    if (!stat.isFile()) return false

    res.statusCode = 200
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Content-Type', contentType(absolutePath))

    if (req.method === 'HEAD') {
      res.end()
      return true
    }

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(absolutePath)
      stream.on('error', reject)
      stream.on('end', resolve)
      stream.pipe(res)
    })
    return true
  } catch {
    return false
  }
}

export class Server {
  constructor({ config, container, db, events, queue, ws }) {
    this.config = config
    this.container = container
    this.db = db
    this.events = events
    this.queue = queue
    this.ws = ws
    this.router = new Router()
    this.router.use(createRateLimiter(config.rateLimit))
    setContainer(container)
  }

  async handle(req, res) {
    this.container.make('response').attach(res)
    req.container = this.container
    const parsedUrl = new URL(req.url, 'http://127.0.0.1')
    req.path = parsedUrl.pathname
    req.query = Object.fromEntries(parsedUrl.searchParams.entries())
    applyCorsHeaders(req, res, this.config.cors)

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    const parsedRequest = await parseRequest(req)
    req.body = parsedRequest.body
    req.files = parsedRequest.files
    req.rawBody = parsedRequest.rawBody
    req.file = (name) => {
      const value = req.files?.[name]
      return Array.isArray(value) ? value[0] : value || null
    }

    const matched = this.router.match(req.method, req.path)
    if (!matched) {
      const served = await serveStatic(req, res, path.resolve(process.cwd(), 'public'))
      if (served) return
      return res.notFound()
    }

    req.params = matched.params
    const stack = await this.router.resolveRouteHandlers(matched.route)

    try {
      await runStack(stack, req, res)
    } catch (error) {
      const statusCode = error.statusCode || 500
      res.error(error.message || 'Server error', statusCode, error.errors || null)
    }
  }

  async start() {
    const server = http.createServer((req, res) => this.handle(req, res))
    this.ws.attach(server)
    await new Promise((resolve) => server.listen(this.config.app.port, resolve))
    console.log(`${this.config.app.name} listening on port ${this.config.app.port}`)
  }
}
