import 'dotenv/config'

export default {
  userModel: 'app/models/User.js',
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey',
  jwtExpiresIn: '7d'
}

