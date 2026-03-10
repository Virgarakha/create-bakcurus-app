import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

function normalizeRelativePath(value = '') {
  const normalized = path.posix.normalize(String(value).replace(/\\/g, '/')).replace(/^\/+/, '')
  if (!normalized || normalized === '.') return ''
  if (normalized.startsWith('../') || normalized === '..') {
    throw new Error('Invalid storage path.')
  }
  return normalized
}

function joinUrl(base, filePath) {
  return `${String(base || '').replace(/\/+$/, '')}/${normalizeRelativePath(filePath)}`
}

function inferExtension(file) {
  const originalName = file?.originalName || file?.filename || ''
  return path.extname(originalName)
}

function storedFileName(file, options = {}) {
  if (options.name) return options.name
  return `${Date.now()}-${crypto.randomUUID()}${inferExtension(file)}`
}

class StorageDisk {
  constructor(name, config) {
    this.name = name
    this.config = config
    this.root = path.resolve(process.cwd(), config.root)
  }

  resolve(filePath = '') {
    const relativePath = normalizeRelativePath(filePath)
    const absolutePath = path.resolve(this.root, relativePath)
    if (absolutePath !== this.root && !absolutePath.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Invalid storage path.')
    }
    return absolutePath
  }

  async put(filePath, contents) {
    const target = this.resolve(filePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, contents)
    return normalizeRelativePath(filePath)
  }

  async putFile(directory, file, options = {}) {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new Error('Uploaded file buffer is required.')
    }
    const relativeDirectory = normalizeRelativePath(directory)
    const fileName = storedFileName(file, options)
    const relativePath = normalizeRelativePath(path.posix.join(relativeDirectory, fileName))
    await this.put(relativePath, file.buffer)
    return relativePath
  }

  async delete(filePath) {
    const target = this.resolve(filePath)
    await fs.unlink(target)
  }

  async exists(filePath) {
    try {
      await fs.access(this.resolve(filePath))
      return true
    } catch {
      return false
    }
  }

  path(filePath = '') {
    return this.resolve(filePath)
  }

  url(filePath = '') {
    if (!this.config.url) {
      throw new Error(`Disk [${this.name}] does not expose public URLs.`)
    }
    return joinUrl(this.config.url, filePath)
  }
}

export class StorageManager {
  constructor(config) {
    this.config = config
  }

  disk(name = null) {
    const diskName = name || this.config.default
    const disk = this.config.disks?.[diskName]
    if (!disk) throw new Error(`Storage disk [${diskName}] is not configured.`)
    return new StorageDisk(diskName, disk)
  }
}
