function appendValue(target, key, value) {
  if (!(key in target)) {
    target[key] = value
    return
  }
  target[key] = Array.isArray(target[key]) ? [...target[key], value] : [target[key], value]
}

function parseMultipart(buffer, boundary) {
  const body = {}
  const files = {}
  const boundaryBuffer = Buffer.from(`--${boundary}`)
  const separator = Buffer.from('\r\n\r\n')
  let cursor = buffer.indexOf(boundaryBuffer)

  while (cursor !== -1) {
    cursor += boundaryBuffer.length
    if (buffer.slice(cursor, cursor + 2).equals(Buffer.from('--'))) break
    if (buffer.slice(cursor, cursor + 2).equals(Buffer.from('\r\n'))) cursor += 2

    const nextBoundary = buffer.indexOf(boundaryBuffer, cursor)
    if (nextBoundary === -1) break

    const part = buffer.slice(cursor, nextBoundary - 2)
    const headerEnd = part.indexOf(separator)
    if (headerEnd === -1) {
      cursor = nextBoundary
      continue
    }

    const headerText = part.slice(0, headerEnd).toString('utf8')
    const content = part.slice(headerEnd + separator.length)
    const headers = Object.fromEntries(
      headerText
        .split('\r\n')
        .map((line) => {
          const separatorIndex = line.indexOf(':')
          if (separatorIndex === -1) return null
          const name = line.slice(0, separatorIndex).trim()
          const value = line.slice(separatorIndex + 1).trim()
          return name && value ? [name.toLowerCase(), value] : null
        })
        .filter(Boolean)
    )

    const disposition = headers['content-disposition'] || ''
    const fieldName = disposition.match(/name="([^"]+)"/i)?.[1]
    if (!fieldName) {
      cursor = nextBoundary
      continue
    }

    const fileName = disposition.match(/filename="([^"]*)"/i)?.[1]
    if (fileName) {
      appendValue(files, fieldName, {
        fieldname: fieldName,
        originalName: fileName,
        mimetype: headers['content-type'] || 'application/octet-stream',
        size: content.length,
        buffer: content
      })
    } else {
      appendValue(body, fieldName, content.toString('utf8'))
    }

    cursor = nextBoundary
  }

  return { body, files }
}

export async function parseRequest(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)
  const contentType = String(req.headers['content-type'] || '')

  if (!buffer.length) {
    return { body: {}, files: {}, rawBody: Buffer.alloc(0) }
  }

  if (contentType.includes('multipart/form-data')) {
    const boundary = contentType.match(/boundary=([^;]+)/i)?.[1]
    if (!boundary) throw new Error('Multipart boundary is missing.')
    const { body, files } = parseMultipart(buffer, boundary)
    return { body, files, rawBody: buffer }
  }

  if (contentType.includes('application/json')) {
    const raw = buffer.toString('utf8')
    return { body: raw ? JSON.parse(raw) : {}, files: {}, rawBody: buffer }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(buffer.toString('utf8'))
    const body = {}
    for (const [key, value] of params.entries()) appendValue(body, key, value)
    return { body, files: {}, rawBody: buffer }
  }

  return { body: { raw: buffer.toString('utf8') }, files: {}, rawBody: buffer }
}
