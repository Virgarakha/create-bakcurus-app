function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export class ResponseFactory {
  attach(res) {
    res.success = (data = null, message = 'OK', statusCode = 200) => {
      if (typeof message === 'number') {
        statusCode = message
        message = 'OK'
      }
      return sendJson(res, statusCode, { status: 'success', success: true, code: statusCode, message, data })
    }

    res.created = (data = null, message = 'Created', statusCode = 201) => {
      if (typeof message === 'number') {
        statusCode = message
        message = 'Created'
      }
      return sendJson(res, statusCode, { status: 'success', success: true, code: statusCode, message, data })
    }

    res.fail = ({ message = 'Error', code = 400, type = null, errors = null, meta = null } = {}) => {
      const payload = { status: 'error', success: false, code, message }
      if (type) payload.type = type
      if (errors) payload.errors = errors
      if (meta?.file) payload.file = meta.file
      if (meta?.line) payload.line = meta.line
      if (meta?.stack) payload.stack = meta.stack

      // Keep extra metadata (if any) under `meta`.
      if (meta) {
        const { file, line, stack, ...rest } = meta
        if (Object.keys(rest).length) payload.meta = rest
      }
      return sendJson(res, code, payload)
    }

    res.error = (message = 'Error', code = 400, errors = null, extra = null) => {
      const type = typeof extra === 'string' ? extra : extra?.type || null
      const meta = typeof extra === 'object' && extra ? extra.meta || null : null
      const inferred = type || (code >= 400 && code < 500 ? 'http' : 'server')
      return res.fail({ message, code, type: inferred, errors, meta })
    }

    res.validationError = (errors = {}, message = 'Validation failed') => res.fail({
      code: 422,
      type: 'validation',
      message,
      errors
    })

    res.serverError = (message = 'Internal Server Error') => res.fail({
      code: 500,
      type: 'server',
      message
    })

    res.databaseError = (message = 'Database error', code = 500) => res.fail({
      code,
      type: 'database',
      message
    })

    res.notFound = (message = 'Not Found') => res.fail({ code: 404, type: 'http', message })
    res.unauthorized = (message = 'Unauthorized') => res.fail({ code: 401, type: 'http', message })
    res.forbidden = (message = 'Forbidden') => res.fail({ code: 403, type: 'http', message })

    res.paginated = (items, meta, message = 'OK') => sendJson(res, 200, {
      status: 'success',
      success: true,
      code: 200,
      message,
      data: items,
      meta
    })
    return res
  }
}
