import bcrypt from 'bcryptjs'
import User from '../models/User'
import { signToken } from 'backurus/core/auth'
import UserRegistered from '../events/UserRegistered'
import { Auth } from 'backurus'

export default class AuthController {
  static async register(req, res) {
    const existing = await User.query().where('email', req.body.email).first()
    if (existing) return res.error('Email already exists', 422)

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: await bcrypt.hash(req.body.password, 10),
      role: req.body.role || 'user'
    })

    await req.container.make('events').emit(new UserRegistered(user))

    const token = signToken({ id: user.id, email: user.email, role: user.role }, req.container.make('config'))
    return res.created({ user, token }, 'Registered successfully')
  }

  static async login(req, res) {
    const user = await User.query().where('email', req.body.email).first()
    if (!user) return res.unauthorized('Invalid credentials')

    const valid = await bcrypt.compare(req.body.password, user.password)
    if (!valid) return res.unauthorized('Invalid credentials')

    const token = signToken({ id: user.id, email: user.email, role: user.role }, req.container.make('config'))
    return res.success({ user, token }, 'Login successful')
  }

  static async logout(req, res) {
    const ok = await Auth.token().delete()
    if (!ok) return res.unauthorized('Missing bearer token')
    return res.success(null, 'Logout successful')
  }
}
