import bcrypt from 'bcryptjs'
import User from '../../app/models/User'

export default {
  async run() {
    const passwordHash = await bcrypt.hash('password', 10)

    const adminExisting = await User.query().where('email', 'admin@example.com').first()
    if (!adminExisting) {
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: passwordHash,
        role: 'admin'
      })
    }

    const users = [
      { name: 'Rakha', email: 'user1@example.com' },
      { name: 'Alya', email: 'user2@example.com' },
      { name: 'Dimas', email: 'user3@example.com' },
      { name: 'Siti', email: 'user4@example.com' },
      { name: 'Budi', email: 'user5@example.com' },
      { name: 'Nadia', email: 'user6@example.com' },
      { name: 'Fajar', email: 'user7@example.com' },
      { name: 'Putri', email: 'user8@example.com' },
      { name: 'Rizky', email: 'user9@example.com' },
      { name: 'Andi', email: 'user10@example.com' }
    ]

    for (const u of users) {
      const existing = await User.query().where('email', u.email).first()
      if (existing) continue
      await User.create({
        name: u.name,
        email: u.email,
        password: passwordHash,
        role: 'user'
      })
    }
  }
}
