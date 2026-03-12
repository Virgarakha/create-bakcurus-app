import User from '../models/User'
import StoreUserRequest from '../requests/StoreUserRequest'
import { validate } from 'backurus/core/validator'

export default class UserController {
  static async index(req, res) {
    const page = Number(req.query.page || 1)
    const perPage = Number(req.query.per_page || 10)
    const result = await User.query().orderBy('id', 'desc').paginate(page, perPage)
    return res.paginated(result.data, result.meta)
  }

  static async show(req, res) {
    const user = await User.find(req.params.id)
    if (!user) return res.notFound('User not found')
    return res.success(user)
  }

  static async store(req, res) {
    const data = await validate(req, StoreUserRequest)
    const user = await User.create(data)
    return res.created(user)
  }

  static async update(req, res) {
    const user = await User.find(req.params.id)
    if (!user) return res.notFound('User not found')
    const updated = await User.update(req.params.id, req.body)
    return res.success(updated, 'User updated')
  }

  static async destroy(req, res) {
    const user = await User.find(req.params.id)
    if (!user) return res.notFound('User not found')
    await User.delete(req.params.id)
    return res.success(null, 'User deleted')
  }

  static async profile(req, res) {
    // Route ini sebaiknya pakai middleware("auth") supaya `req.user` sudah terisi.
    if (Auth.guest()) return res.error('Unauthorized', 401)
    return res.success(Auth.user())
  }
}
