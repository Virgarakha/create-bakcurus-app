import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

class ScheduledCommand {
  constructor(entry) {
    this.entry = entry
  }

  daily() {
    this.entry.expression = 'daily'
    return this
  }

  hourly() {
    this.entry.expression = 'hourly'
    return this
  }

  everyMinute() {
    this.entry.expression = 'everyMinute'
    return this
  }
}

export class Scheduler {
  constructor() {
    this.entries = []
  }

  command(command, handler = null) {
    const entry = { type: 'command', command, handler, expression: 'manual' }
    this.entries.push(entry)
    return new ScheduledCommand(entry)
  }

  list() {
    return this.entries
  }

  async runAll() {
    for (const entry of this.entries) {
      if (entry.handler) {
        await entry.handler()
        continue
      }
      await new Promise((resolve, reject) => {
        const child = spawn('node', ['urus', entry.command], {
          cwd: process.cwd(),
          stdio: 'inherit'
        })
        child.on('exit', (code) => {
          if (code === 0) return resolve()
          reject(new Error(`Scheduled command [${entry.command}] exited with code ${code}`))
        })
        child.on('error', reject)
      })
    }
  }
}

export async function loadSchedule(scheduler) {
  const file = path.resolve(process.cwd(), 'routes/console.js')
  try {
    await fs.access(file)
    const mod = await import(pathToFileURL(file).href)
    if (typeof mod.default === 'function') {
      await mod.default(scheduler)
    }
  } catch {
    // Optional scheduler file.
  }
}
