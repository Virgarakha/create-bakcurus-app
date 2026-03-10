import bcrypt from 'bcryptjs'
import User from '../../app/models/User'

export default {
  async run() {
    const existing = await User.query().where('email', 'admin@example.com').first()
    if (existing) return

    await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('password', 10),
      role: 'admin'
    })
  }
}
