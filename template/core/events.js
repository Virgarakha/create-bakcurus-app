export class EventBus {
  constructor(container) {
    this.container = container
    this.listeners = new Map()
  }

  listen(eventName, handler) {
    const list = this.listeners.get(eventName) || []
    list.push(handler)
    this.listeners.set(eventName, list)
  }

  async emit(eventOrName, payload = null) {
    const eventName = typeof eventOrName === 'string'
      ? eventOrName
      : eventOrName?.constructor?.name

    if (!eventName) return

    const eventInstance = typeof eventOrName === 'string' ? payload : eventOrName
    const list = this.listeners.get(eventName) || []
    for (const listener of list) {
      await listener(eventInstance, this.container)
    }
  }
}

export async function event(eventOrName, container, payload = null) {
  return container.make('events').emit(eventOrName, payload)
}
