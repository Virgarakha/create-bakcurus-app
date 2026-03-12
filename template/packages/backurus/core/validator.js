import { ValidationError } from './errors/HttpError.js'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isEmpty(value) {
  return value === undefined || value === null || value === ''
}

function asArray(value) {
  return Array.isArray(value) ? value : [value]
}

function parseRule(rule) {
  const [name, rawArgs] = String(rule).split(':')
  const args = rawArgs ? rawArgs.split(',') : []
  return { name, args }
}

function getByPath(obj, path) {
  if (!path) return obj
  const parts = String(path).split('.')
  let cur = obj
  for (const part of parts) {
    if (cur === undefined || cur === null) return undefined
    if (Array.isArray(cur) && /^\d+$/.test(part)) cur = cur[Number(part)]
    else cur = cur[part]
  }
  return cur
}

function setByPath(obj, path, value) {
  const parts = String(path).split('.')
  let cur = obj
  for (let i = 0; i < parts.length; i += 1) {
    const key = parts[i]
    const last = i === parts.length - 1
    const nextKey = parts[i + 1]
    const nextIsIndex = nextKey !== undefined && /^\d+$/.test(nextKey)

    if (last) {
      cur[key] = value
      return
    }

    if (cur[key] === undefined) {
      cur[key] = nextIsIndex ? [] : {}
    }
    cur = cur[key]
  }
}

function cloneJson(value) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isFileLike(value) {
  return value && typeof value === 'object' && Buffer.isBuffer(value.buffer) && typeof value.size === 'number'
}

function normalizeFiles(files = {}) {
  const out = {}
  for (const [key, value] of Object.entries(files || {})) {
    if (Array.isArray(value)) out[key] = value[0] || null
    else out[key] = value
  }
  return out
}

function expandWildcard(ruleKey, data) {
  // tags.* -> tags.0, tags.1 ...
  if (!String(ruleKey).includes('.*')) return [ruleKey]
  const [prefix] = String(ruleKey).split('.*')
  const target = getByPath(data, prefix)
  if (!Array.isArray(target)) return []
  return target.map((_v, index) => `${prefix}.${index}`)
}

function loadLocaleMessages(locale) {
  const normalized = String(locale || process.env.APP_LOCALE || 'en').toLowerCase()
  if (normalized.startsWith('id')) return import('../resources/lang/id/validation.js').then((m) => m.default).catch(() => ({}))
  return import('../resources/lang/en/validation.js').then((m) => m.default).catch(() => ({}))
}

function formatMessage(template, params) {
  let out = String(template || '')
  for (const [key, value] of Object.entries(params || {})) {
    out = out.replaceAll(`:${key}`, String(value))
  }
  return out
}

function pickMessage(messages, field, ruleName) {
  const fieldMessages = messages?.[field]
  if (!fieldMessages) return null
  return fieldMessages?.[ruleName] || null
}

function truthyPresence(value) {
  if (isEmpty(value)) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function parseDimensionsArgs(args = []) {
  const raw = String(args[0] || '')
  const pairs = raw.split(',').map((p) => p.trim()).filter(Boolean)
  const out = {}
  for (const pair of pairs) {
    const [k, v] = pair.split('=')
    if (!k || v === undefined) continue
    out[k.trim()] = Number(v)
  }
  return out
}

function parsePngDimensions(buffer) {
  // PNG signature + IHDR chunk at byte 16
  if (!buffer || buffer.length < 24) return null
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return { width, height }
}

function parseJpegDimensions(buffer) {
  if (!buffer || buffer.length < 4) return null
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
  let offset = 2
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue }
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
    if (isSOF) {
      const height = buffer.readUInt16BE(offset + 5)
      const width = buffer.readUInt16BE(offset + 7)
      return { width, height }
    }
    offset += 2 + length
  }
  return null
}

function imageDimensions(file) {
  const buffer = file?.buffer
  if (!Buffer.isBuffer(buffer)) return null
  return parsePngDimensions(buffer) || parseJpegDimensions(buffer)
}

function checkPassword(value) {
  const s = String(value || '')
  if (s.length < 8) return false
  if (!/[a-z]/.test(s)) return false
  if (!/[A-Z]/.test(s)) return false
  if (!/[0-9]/.test(s)) return false
  if (!/[^A-Za-z0-9]/.test(s)) return false
  return true
}

function applyRule({ field, ruleName, args, value, data, files, ctx }) {
  const other = (path) => {
    const v = getByPath(data, path)
    if (v !== undefined) return v
    return getByPath(files, path)
  }

  if (ruleName === 'required') {
    if (isEmpty(value)) return { ok: false }
    return { ok: true }
  }

  if (ruleName === 'required_if') {
    const [otherField, expected] = args
    if (String(other(otherField)) === String(expected) && isEmpty(value)) return { ok: false }
    return { ok: true, skipIfEmpty: true }
  }

  if (ruleName === 'required_unless') {
    const [otherField, expected] = args
    if (String(other(otherField)) !== String(expected) && isEmpty(value)) return { ok: false }
    return { ok: true, skipIfEmpty: true }
  }

  if (ruleName === 'required_with') {
    const present = args.some((name) => truthyPresence(other(name)))
    if (present && isEmpty(value)) return { ok: false }
    return { ok: true, skipIfEmpty: true, meta: { values: args.join(',') } }
  }

  if (ruleName === 'required_without') {
    const missing = args.some((name) => !truthyPresence(other(name)))
    if (missing && isEmpty(value)) return { ok: false }
    return { ok: true, skipIfEmpty: true, meta: { values: args.join(',') } }
  }

  // Non-required rules should ignore empties.
  if (isEmpty(value)) return { ok: true, skipIfEmpty: true }

  if (ruleName === 'string') {
    return { ok: typeof value === 'string' }
  }

  if (ruleName === 'integer') {
    return { ok: Number.isInteger(typeof value === 'number' ? value : Number(value)) }
  }

  if (ruleName === 'boolean') {
    return { ok: typeof value === 'boolean' || ['true', 'false', '0', '1'].includes(String(value)) }
  }

  if (ruleName === 'array') {
    return { ok: Array.isArray(value) }
  }

  if (ruleName === 'email') {
    return { ok: emailRegex.test(String(value)) }
  }

  if (ruleName === 'alpha_spaces') {
    return { ok: /^[A-Za-z\s]+$/.test(String(value)) }
  }

  if (ruleName === 'min') {
    const min = Number(args[0])
    if (isFileLike(value)) return { ok: value.size / 1024 >= min, meta: { min } }
    if (typeof value === 'number') return { ok: value >= min, meta: { min } }
    return { ok: String(value).length >= min, meta: { min } }
  }

  if (ruleName === 'max') {
    const max = Number(args[0])
    if (isFileLike(value)) return { ok: value.size / 1024 <= max, meta: { max } }
    if (typeof value === 'number') return { ok: value <= max, meta: { max } }
    return { ok: String(value).length <= max, meta: { max } }
  }

  if (ruleName === 'file') {
    return { ok: isFileLike(value) }
  }

  if (ruleName === 'mimes') {
    if (!isFileLike(value)) return { ok: false }
    const allowed = args.map((v) => String(v).toLowerCase())
    const name = String(value.originalName || '')
    const ext = name.includes('.') ? name.split('.').at(-1).toLowerCase() : ''
    const mime = String(value.mimetype || '').toLowerCase()
    const ok = allowed.includes(ext) || allowed.some((a) => mime.includes(a))
    return { ok, meta: { values: allowed.join(',') } }
  }

  if (ruleName === 'image') {
    if (!isFileLike(value)) return { ok: false }
    const mime = String(value.mimetype || '').toLowerCase()
    if (!mime.startsWith('image/')) return { ok: false }
    return { ok: Boolean(imageDimensions(value)) }
  }

  if (ruleName === 'dimensions') {
    if (!isFileLike(value)) return { ok: false }
    const dims = imageDimensions(value)
    if (!dims) return { ok: false }
    const opts = parseDimensionsArgs(args)
    const ok = [
      opts.min_width ? dims.width >= opts.min_width : true,
      opts.min_height ? dims.height >= opts.min_height : true,
      opts.max_width ? dims.width <= opts.max_width : true,
      opts.max_height ? dims.height <= opts.max_height : true,
      opts.width ? dims.width === opts.width : true,
      opts.height ? dims.height === opts.height : true
    ].every(Boolean)
    return { ok }
  }

  if (ruleName === 'password') {
    return { ok: checkPassword(value) }
  }

  // Unknown rules: treat as pass to avoid breaking older apps.
  if (!ctx?.strict) return { ok: true }
  return { ok: false }
}

export function sanitize(input, schema = {}) {
  const data = cloneJson(input || {})

  const applyOne = (value, ruleName) => {
    if (value === undefined || value === null) return value
    if (ruleName === 'trim') return typeof value === 'string' ? value.trim() : value
    if (ruleName === 'lowercase') return typeof value === 'string' ? value.toLowerCase() : value
    if (ruleName === 'uppercase') return typeof value === 'string' ? value.toUpperCase() : value
    if (ruleName === 'escape_html') return typeof value === 'string' ? escapeHtml(value) : value
    if (ruleName === 'slug') return typeof value === 'string' ? slugify(value) : value
    return value
  }

  for (const [key, ruleString] of Object.entries(schema || {})) {
    const targets = String(key).includes('.*') ? expandWildcard(key, data) : [key]
    for (const target of targets) {
      const current = getByPath(data, target)
      const rules = String(ruleString || '').split('|').map((r) => r.trim()).filter(Boolean)
      let next = current
      for (const rule of rules) {
        const { name } = parseRule(rule)
        next = applyOne(next, name)
      }
      setByPath(data, target, next)
    }
  }

  return data
}

export function validator(input, rules = {}, messages = null, options = {}) {
  const ctx = {
    locale: options.locale || process.env.APP_LOCALE || 'en',
    strict: Boolean(options.strict),
    files: normalizeFiles(options.files || {})
  }

  const state = {
    beforeHooks: [],
    afterHooks: [],
    sanitizers: null
  }

  const api = {
    before(fn) {
      state.beforeHooks.push(fn)
      return api
    },
    after(fn) {
      state.afterHooks.push(fn)
      return api
    },
    sanitize(schema) {
      state.sanitizers = schema
      return api
    },
    async validate() {
      let data = cloneJson(input || {})
      const files = ctx.files

      for (const hook of state.beforeHooks) {
        await hook(data, { files })
      }

      if (state.sanitizers) {
        data = sanitize(data, state.sanitizers)
      }

      const localeMessages = await loadLocaleMessages(ctx.locale)
      const errors = {}
      const msgMap = messages || {}

      for (const [ruleKey, ruleString] of Object.entries(rules || {})) {
        const targets = String(ruleKey).includes('.*') ? expandWildcard(ruleKey, data) : [ruleKey]

        // If rule targets are wildcard but data isn't array, still validate base key if it's present.
        const effectiveTargets = targets.length ? targets : [ruleKey.replace('.*', '')]

        for (const field of effectiveTargets) {
          const value = (() => {
            const v = getByPath(data, field)
            if (v !== undefined) return v
            return getByPath(files, field)
          })()

          const ruleList = String(ruleString || '').split('|').map((r) => r.trim()).filter(Boolean)
          for (const rawRule of ruleList) {
            const { name, args } = parseRule(rawRule)
            const result = applyRule({ field, ruleName: name, args, value, data, files, ctx })
            if (!result.ok) {
              const custom = pickMessage(msgMap, ruleKey, name) || pickMessage(msgMap, field, name)
              const template = custom || localeMessages[name] || `${field} is invalid`
              const meta = { field: field, other: args[0], value: args[1], values: args.join(','), ...(result.meta || {}) }
              const message = formatMessage(template, meta)
              errors[field] = errors[field] || []
              errors[field].push(message)
            }
          }
        }
      }

      for (const hook of state.afterHooks) {
        await hook(data, { files, errors })
      }

      if (Object.keys(errors).length) {
        throw new ValidationError(errors)
      }

      return data
    }
  }

  return api
}

function looksLikeRequest(value) {
  return value && typeof value === 'object' && ('body' in value || 'files' in value)
}

function isClassLike(value) {
  return typeof value === 'function'
}

export async function validate(arg1, arg2, arg3 = null, arg4 = null) {
  // Request-class validation: validate(req, RequestClass)
  if (looksLikeRequest(arg1) && isClassLike(arg2)) {
    const req = arg1
    const RequestClass = arg2
    const request = new RequestClass()
    const rules = typeof request.rules === 'function' ? request.rules() : {}
    const messages = typeof request.messages === 'function' ? request.messages() : null
    const sanitizers = typeof request.sanitize === 'function' ? request.sanitize() : null

    const config = req.container?.make ? req.container.make('config') : null
    const v = validator(req.body || {}, rules, messages, {
      locale: config?.app?.locale || process.env.APP_LOCALE || 'en',
      files: req.files || {},
      strict: false
    })

    if (sanitizers) v.sanitize(sanitizers)

    const validated = await v.validate()
    req.body = validated
    return validated
  }

  // Data-schema validation: validate(data, rules, messages?, options?)
  const data = arg1
  const rules = arg2 || {}
  const messages = arg3
  const options = arg4 || {}
  return validator(data, rules, messages, options).validate()
}
