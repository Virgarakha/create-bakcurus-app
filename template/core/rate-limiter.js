export function createRateLimiter({ max, windowMs }) {
  const hits = new Map()

  return async function rateLimiter(req, res, next) {
    const ip = req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const entry = hits.get(ip) || { count: 0, resetAt: now + windowMs }

    if (now > entry.resetAt) {
      entry.count = 0
      entry.resetAt = now + windowMs
    }

    entry.count += 1
    hits.set(ip, entry)

    if (entry.count > max) {
      return res.error('Too many requests', 429)
    }

    return next()
  }
}
