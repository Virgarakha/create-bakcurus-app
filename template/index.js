import path from 'node:path'
import { spawn } from 'node:child_process'

const registerFile = path.resolve(process.cwd(), 'backurus-register.mjs')

if (!process.execArgv.includes('--import')) {
  const child = spawn(process.execPath, ['--import', registerFile, process.argv[1], ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  })
  child.on('exit', (code) => process.exit(code ?? 0))
} else {
  const { createApp } = await import('./bootstrap/app.js')
  const app = await createApp()
  await app.start()
}
