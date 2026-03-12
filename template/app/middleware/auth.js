import { authMiddleware } from 'backurus/core/auth'

export default function makeAuth(container) {
  return authMiddleware(container)
}
