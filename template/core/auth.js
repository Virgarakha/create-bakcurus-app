import jwt from 'jsonwebtoken'

export function signToken(payload, config) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiresIn })
}

export function authMiddleware(container) {
  const config = container.make('config')
  return async (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return res.unauthorized('Missing bearer token')
    try {
      req.user = jwt.verify(authHeader.slice(7), config.auth.jwtSecret)
      return next()
    } catch {
      return res.unauthorized('Invalid token')
    }
  }
}

export function roleGuard(...roles) {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.unauthorized('Forbidden')
    return next()
  }
}
