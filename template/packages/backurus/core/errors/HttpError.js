export class HttpError extends Error {
  constructor(message = 'Error', statusCode = 500, { type = 'http', errors = null, expose = null } = {}) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.type = type
    this.errors = errors
    this.expose = expose ?? (statusCode >= 400 && statusCode < 500)
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(message, 404, { type: 'http' })
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(message, 401, { type: 'http' })
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(message, 403, { type: 'http' })
  }
}

export class ValidationError extends HttpError {
  constructor(errors = {}, message = 'Validation failed') {
    super(message, 422, { type: 'validation', errors, expose: true })
  }
}

export class DatabaseError extends HttpError {
  constructor(message = 'Database error', statusCode = 500, { errors = null, expose = false } = {}) {
    super(message, statusCode, { type: 'database', errors, expose })
  }
}

export class MigrationError extends Error {
  constructor(message = 'Migration failed', { file = null, operation = null, cause = null } = {}) {
    super(message)
    this.name = this.constructor.name
    this.file = file
    this.operation = operation
    this.cause = cause
  }
}

export class SeederError extends Error {
  constructor(message = 'Seeder failed', { file = null, cause = null } = {}) {
    super(message)
    this.name = this.constructor.name
    this.file = file
    this.cause = cause
  }
}

