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

  async emit(eventInstance) {
    const eventName = eventInstance.constructor.name
    const list = this.listeners.get(eventName) || []
    for (const listener of list) {
      await listener(eventInstance, this.container)
    }
  }
}

export async function event(eventInstance, container) {
  return container.make('events').emit(eventInstance)
}
