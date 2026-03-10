function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export class ResponseFactory {
  attach(res) {
    res.success = (data = null, message = 'OK') => sendJson(res, 200, { success: true, message, data })
    res.created = (data = null, message = 'Created') => sendJson(res, 201, { success: true, message, data })
    res.error = (message = 'Error', statusCode = 400, errors = null) => sendJson(res, statusCode, { success: false, message, errors })
    res.notFound = (message = 'Not Found') => sendJson(res, 404, { success: false, message })
    res.unauthorized = (message = 'Unauthorized') => sendJson(res, 401, { success: false, message })
    res.paginated = (items, meta) => sendJson(res, 200, { success: true, data: items, meta })
    return res
  }
}
