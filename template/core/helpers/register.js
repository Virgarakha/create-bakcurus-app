import { app } from './app.js'
import { cache } from './cache.js'
import { collect } from './collect.js'
import { event, listen } from './events.js'
import { faker } from './faker.js'
import { limit } from './limit.js'
import { log } from './log.js'
import { str } from './str.js'
import { Cache, DB, Event, Gate, Log, Queue, Storage } from '../facades.js'
import { sanitize, validate, validator } from '../validator.js'
import { config } from '../config.js'

export function registerGlobals() {
  const defs = {
    app,
    cache,
    collect,
    event,
    listen,
    faker,
    limit,
    log,
    str,
    sanitize,
    validate,
    validator,
    config,
    Cache,
    DB,
    Event,
    Gate,
    Log,
    Queue,
    Storage
  }

  for (const [key, value] of Object.entries(defs)) {
    if (globalThis[key] === undefined) globalThis[key] = value
  }

  return defs
}
