import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

const loaderPath = pathToFileURL(path.resolve(process.cwd(), 'backurus-loader.mjs')).href
register(loaderPath, pathToFileURL('./'))
