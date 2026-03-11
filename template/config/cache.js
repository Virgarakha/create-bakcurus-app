import 'dotenv/config'

export default {
  driver: process.env.CACHE_DRIVER || 'memory',
  prefix: process.env.CACHE_PREFIX || 'backurus:',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined
  }
}

