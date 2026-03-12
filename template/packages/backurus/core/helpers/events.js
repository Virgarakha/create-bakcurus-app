import { Event } from '../facades.js'

export function event(name, payload = null) {
  return Event.emit(name, payload)
}

export function listen(name, handler) {
  return Event.listen(name, handler)
}

