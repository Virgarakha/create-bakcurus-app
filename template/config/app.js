import 'dotenv/config'

export default {
  name: process.env.APP_NAME || 'Backurus',
  port: Number(process.env.APP_PORT || 3000),
  env: process.env.APP_ENV || 'development',
  url: process.env.APP_URL || `http://127.0.0.1:${process.env.APP_PORT || 3000}`
}
