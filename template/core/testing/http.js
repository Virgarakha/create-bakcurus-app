function defaultBaseUrl() {
  if (process.env.TEST_BASE_URL) return process.env.TEST_BASE_URL
  if (process.env.APP_URL) return process.env.APP_URL
  const port = process.env.APP_PORT || 3000
  return `http://127.0.0.1:${port}`
}

async function parseBody(res) {
  const contentType = String(res.headers.get('content-type') || '')
  if (contentType.includes('application/json')) {
    return res.json().catch(() => null)
  }
  return res.text().catch(() => null)
}

export function http(baseUrl = defaultBaseUrl()) {
  const request = async (method, pathname, body = null, headers = {}) => {
    const url = new URL(pathname, baseUrl).toString()
    const init = { method, headers: { ...headers } }
    if (body !== null && body !== undefined) {
      init.headers['Content-Type'] = init.headers['Content-Type'] || 'application/json'
      init.body = init.headers['Content-Type'].includes('application/json') ? JSON.stringify(body) : String(body)
    }
    const res = await fetch(url, init)
    const data = await parseBody(res)
    return { status: res.status, headers: res.headers, data, raw: res }
  }

  return {
    get: (path, headers) => request('GET', path, null, headers),
    post: (path, body, headers) => request('POST', path, body, headers),
    put: (path, body, headers) => request('PUT', path, body, headers),
    patch: (path, body, headers) => request('PATCH', path, body, headers),
    delete: (path, body, headers) => request('DELETE', path, body, headers)
  }
}

