import 'dotenv/config'

export default {
  default: process.env.QUEUE_CONNECTION || 'sync',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379)
  }
}

