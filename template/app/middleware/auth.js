import { authMiddleware } from '../../core/auth'

export default function makeAuth(container) {
  return authMiddleware(container)
}
