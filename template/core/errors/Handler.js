import fsp from 'node:fs/promises'
import path from 'node:path'
import { DatabaseError, HttpError, MigrationError, SeederError, ValidationError } from './HttpError.js'

function isDevelopment(config) {
  return String(config?.app?.env || process.env.APP_ENV || 'development').toLowerCase() === 'development'
}

function acceptsHtml(req) {
  const accept = String(req?.headers?.accept || '')
  return accept.includes('text/html')
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function extractFileLine(stack = '') {
  const text = String(stack || '')
  const line = text.split('\n').find((row) => row.includes('file:') || row.includes(process.cwd()))
  if (!line) return { file: null, line: null }
  const match = line.match(/\(?(.+?):(\d+):(\d+)\)?$/)
  if (!match) return { file: null, line: null }
  return { file: match[1], line: Number(match[2]) }
}

function isJsonParseError(error) {
  return error instanceof SyntaxError && /JSON/i.test(String(error.message || ''))
}

function normalizeStatusCode(error) {
  const candidate = error?.statusCode ?? error?.status ?? null
  if (typeof candidate === 'number' && candidate >= 400 && candidate <= 599) return candidate
  return 500
}

function normalizeDatabaseError(error) {
  const code = String(error?.code || '')
  const message = String(error?.sqlMessage || error?.message || 'Database error')

  // MySQL duplicate key.
  if (code === 'ER_DUP_ENTRY') {
    const keyMatch = message.match(/for key '([^']+)'/i)
    const key = keyMatch?.[1] || null
    const column = key?.includes('.') ? key.split('.').at(-1) : key
    const pretty = column
      ? (String(column).toLowerCase() === 'email' ? 'Duplicate email address' : `Duplicate ${column}`)
      : 'Duplicate value'
    return new DatabaseError(pretty, 409, { expose: true })
  }

  // SQLite unique/constraint.
  if (code.startsWith('SQLITE_CONSTRAINT') || /UNIQUE constraint failed/i.test(message)) {
    const match = message.match(/UNIQUE constraint failed:\s*([^\s]+)/i)
    const target = match?.[1] || null
    const column = target?.includes('.') ? target.split('.').at(-1) : target
    const pretty = column
      ? (String(column).toLowerCase() === 'email' ? 'Duplicate email address' : `Duplicate ${column}`)
      : 'Duplicate value'
    return new DatabaseError(pretty, 409, { expose: true })
  }

  // Table exists / missing table.
  if (code === 'ER_TABLE_EXISTS_ERROR' || /already exists/i.test(message)) {
    return new DatabaseError('Table already exists', 409, { expose: true })
  }
  if (code === 'ER_NO_SUCH_TABLE' || /no such table/i.test(message)) {
    return new DatabaseError('Table does not exist', 500, { expose: false })
  }

  return null
}

async function logErrorToFile(error, req, info) {
  const logsDir = path.resolve(process.cwd(), 'logs')
  const filePath = path.join(logsDir, 'error.log')
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const lines = [
    `[${stamp}]`,
    '',
    `Error: ${error?.message || 'Unknown error'}`,
    `Type: ${info?.type || 'server'}`,
    `Code: ${info?.code || 500}`,
    req ? `Request: ${req.method || ''} ${req.path || ''}` : null,
    info?.file ? `File: ${info.file}` : null,
    info?.line ? `Line: ${info.line}` : null,
    error?.stack ? `Stack: ${error.stack}` : null,
    '',
    ''
  ].filter(Boolean)

  await fsp.mkdir(logsDir, { recursive: true })
  await fsp.appendFile(filePath, lines.join('\n'), 'utf8')
}

function renderPrettyHtml({ title, message, file, line, stack, req }) {
  const requestBlock = {
    method: req?.method,
    path: req?.path,
    query: req?.query,
    params: req?.params,
    headers: req?.headers,
    body: req?.body
  }

  const stackHtml = stack
    ? `<pre class="stack">${String(stack).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #0b1020; color: #e6e8ef; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .meta { font-size: 13px; opacity: 0.85; }
    .stack { overflow: auto; padding: 12px; background: rgba(0,0,0,0.35); border-radius: 10px; border: 1px solid rgba(255,255,255,0.10); }
    .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 900px) { .grid { grid-template-columns: 1.3fr 1fr; } }
    code { color: #b8f2e6; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); }
    a { color: #a8d1ff; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1><span class="badge">Backurus Error</span> ${message}</h1>
      <div class="meta">${file ? `<div>File: <code>${file}</code>${line ? `:${line}` : ''}</div>` : ''}</div>
    </div>
    <div class="grid" style="margin-top: 12px;">
      <div class="card">
        <h1>Stack Trace</h1>
        ${stackHtml || '<div class="meta">No stack trace</div>'}
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function handleError(error, req, res, { config } = {}) {
  const dev = isDevelopment(config)
  const dbMapped = normalizeDatabaseError(error)
  const normalized = dbMapped || error

  // Invalid JSON should be a 400, not a 500.
  if (!dbMapped && isJsonParseError(error) && String(req?.headers?.['content-type'] || '').includes('application/json')) {
    error = new HttpError('Invalid JSON payload', 400, { type: 'http', expose: true })
  } else {
    error = normalized
  }

  const code = normalizeStatusCode(error)
  const inferredType = code >= 400 && code < 500 ? 'http' : 'server'
  const type = error?.type || (error instanceof ValidationError ? 'validation' : (error instanceof DatabaseError ? 'database' : inferredType))
  const expose = error?.expose ?? (code >= 400 && code < 500)
  const message = dev ? (error?.message || 'Error') : (expose ? (error?.message || 'Error') : 'Internal Server Error')
  const errors = error?.errors || null

  const stack = dev ? (error?.stack || null) : null
  const location = dev ? extractFileLine(error?.stack || '') : { file: null, line: null }

  const meta = dev ? { file: location.file, line: location.line, stack } : null

  // Log only actionable errors by default.
  if (code >= 500 || type === 'database') {
    logErrorToFile(error, req, { code, type, ...location }).catch(() => {})
  }

  if (dev && acceptsHtml(req)) {
    const html = renderPrettyHtml({
      title: 'Backurus Error',
      message,
      file: location.file,
      line: location.line,
      stack,
      req
    })
    res.statusCode = code
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(html)
    return
  }

  if (typeof res?.fail === 'function') {
    return res.fail({ message, code, type, errors, meta })
  }

  // Fallback in case ResponseFactory wasn't attached.
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ status: 'error', success: false, code, type, message, errors, meta }))
}

const ANSI = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  green: '\u001b[32m',
  gray: '\u001b[90m'
}

export function formatCliError(error, { title = 'Backurus Error', context = null } = {}) {
  const code = normalizeStatusCode(error)
  const loc = extractFileLine(error?.stack || '')
  const lines = []

  lines.push(`${ANSI.red}[${title}]${ANSI.reset}`)
  lines.push('')
  lines.push(`${ANSI.red}${error?.message || 'Unknown error'}${ANSI.reset}`)
  lines.push('')

  if (error instanceof MigrationError) {
    lines.push(`${ANSI.yellow}Migration failed.${ANSI.reset}`)
    if (error.file) lines.push(`File: ${error.file}`)
    if (error.cause?.message) lines.push(`Reason: ${error.cause.message}`)
  } else if (error instanceof SeederError) {
    lines.push(`${ANSI.yellow}Seeding failed.${ANSI.reset}`)
    if (error.file) lines.push(`File: ${error.file}`)
    if (error.cause?.message) lines.push(`Reason: ${error.cause.message}`)
  } else {
    if (context) lines.push(`${ANSI.gray}${context}${ANSI.reset}`)
    if (loc.file) lines.push(`File: ${loc.file}${loc.line ? `:${loc.line}` : ''}`)
    if (code) lines.push(`Code: ${code}`)
  }

  if (error?.stack) {
    lines.push('')
    lines.push(`${ANSI.gray}${error.stack}${ANSI.reset}`)
  }

  return lines.join('\n')
}
