import 'dotenv/config'

export default {
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey',
  jwtExpiresIn: '7d'
}
