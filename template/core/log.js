import fsp from 'node:fs/promises'
import path from 'node:path'

function timestamp() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function formatContext(context) {
  if (!context) return ''
  try {
    return ` ${JSON.stringify(context)}`
  } catch {
    return ` ${String(context)}`
  }
}

export class Logger {
  constructor({ basePath = 'storage/logs', fileName = 'backurus.log' } = {}) {
    this.basePath = basePath
    this.filePath = path.resolve(process.cwd(), basePath, fileName)
  }

  async _write(level, message, context = null) {
    await fsp.mkdir(path.dirname(this.filePath), { recursive: true })
    const line = `[${timestamp()}] ${level.toUpperCase()}: ${message}${formatContext(context)}\n`
    await fsp.appendFile(this.filePath, line, 'utf8')
  }

  info(message, context = null) {
    return this._write('info', message, context)
  }

  warn(message, context = null) {
    return this._write('warn', message, context)
  }

  error(message, context = null) {
    return this._write('error', message, context)
  }
}

