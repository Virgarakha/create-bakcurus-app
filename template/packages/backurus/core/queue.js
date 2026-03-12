import Redis from 'ioredis'

export class QueueManager {
  constructor(config, container) {
    this.config = config
    this.container = container
    this.jobs = new Map()
    this.memoryQueue = []
    if (config.queue.default === 'redis') {
      this.redis = new Redis(config.queue.redis)
    }
  }

  register(jobName, handler) {
    this.jobs.set(jobName, handler)
  }

  async dispatch(job) {
    const payload = { name: job.constructor.name, data: job }
    if (this.config.queue.default === 'redis' && this.redis) {
      await this.redis.lpush('jobs', JSON.stringify(payload))
      return payload
    }
    this.memoryQueue.push(payload)
    await this.processPayload(payload)
    return payload
  }

  async dispatchLater(job, delayMs) {
    setTimeout(() => this.dispatch(job), delayMs)
  }

  async processPayload(payload) {
    const handler = this.jobs.get(payload.name)
    if (!handler) return
    await handler(payload.data, this.container)
  }

  async work() {
    if (this.config.queue.default === 'redis' && this.redis) {
      while (true) {
        const data = await this.redis.brpop('jobs', 0)
        if (!data?.[1]) continue
        await this.processPayload(JSON.parse(data[1]))
      }
    }

    while (this.memoryQueue.length) {
      await this.processPayload(this.memoryQueue.shift())
    }
  }
}

export function dispatch(job, container) {
  return container.make('queue').dispatch(job)
}
