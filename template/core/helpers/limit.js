const buckets = new Map()

function now() {
  return Date.now()
}

export function limit(name, max, windowSeconds) {
  const limitMax = Number(max)
  const windowMs = Number(windowSeconds) * 1000

  return async function rateLimitByName(req, res, next) {
    const ip = req.socket?.remoteAddress || 'unknown'
    const key = `${name}:${ip}`
    const current = buckets.get(key) || { count: 0, resetAt: now() + windowMs }

    if (now() > current.resetAt) {
      current.count = 0
      current.resetAt = now() + windowMs
    }

    current.count += 1
    buckets.set(key, current)

    if (current.count > limitMax) {
      return res.error('Too many requests', 429)
    }

    return next()
  }
}

