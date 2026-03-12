import jwt from 'jsonwebtoken'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function revokedTokenKey(token) {
  return `auth:revoked:${token}`
}

function bearerTokenFromReq(req) {
  const authHeader = req?.headers?.authorization
  if (!authHeader) return null
  const value = String(authHeader)
  if (!value.toLowerCase().startsWith('bearer ')) return null
  const token = value.slice(7).trim()
  return token || null
}

let importedUserModel = null
async function resolveUserModelFromConfig(container) {
  if (importedUserModel) return importedUserModel
  const config = container.make('config')
  const userModelPath = config?.auth?.userModel
  if (!userModelPath) return null
  const absolute = path.resolve(process.cwd(), String(userModelPath))
  const mod = await import(pathToFileURL(absolute).href)
  importedUserModel = mod.default ?? null
  return importedUserModel
}

async function loadUserById(container, userId) {
  if (!userId) return null

  if (container.has('auth.userProvider')) {
    const provider = container.make('auth.userProvider')
    return provider ? await provider(userId, { container }) : null
  }

  const UserModel = await resolveUserModelFromConfig(container)
  if (!UserModel || typeof UserModel.find !== 'function') return null
  return UserModel.find(userId)
}

export function signToken(payload, config) {
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiresIn })
}

export function authMiddleware(container) {
  const config = container.make('config')
  return async (req, res, next) => {
    const token = bearerTokenFromReq(req)
    if (!token) return res.unauthorized('Missing bearer token')
    try {
      const cache = container.make('cache')
      const revoked = await cache.get(revokedTokenKey(token), null)
      if (revoked) return res.unauthorized('Token revoked')

      const payload = jwt.verify(token, config.auth.jwtSecret)
      const userId = payload?.id
      if (!userId) return res.unauthorized('Invalid token')

      const user = await loadUserById(container, userId)
      if (!user) return res.unauthorized('Unauthorized')

      req.token = token
      req.auth = { token, payload }
      req.user = user
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
