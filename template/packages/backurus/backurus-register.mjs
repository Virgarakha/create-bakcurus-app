import { register } from 'node:module'
const loaderUrl = new URL('./backurus-loader.mjs', import.meta.url)
register(loaderUrl.href, import.meta.url)
