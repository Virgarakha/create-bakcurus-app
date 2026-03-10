const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function applyRule(field, value, rule) {
  const [name, arg] = rule.split(':')
  if (name === 'required' && (value === undefined || value === null || value === '')) return `${field} is required`
  if (value === undefined || value === null || value === '') return null
  if (name === 'min' && String(value).length < Number(arg)) return `${field} must be at least ${arg} characters`
  if (name === 'max' && String(value).length > Number(arg)) return `${field} must not exceed ${arg} characters`
  if (name === 'email' && !emailRegex.test(String(value))) return `${field} must be a valid email`
  return null
}

export async function validate(req, RequestClass) {
  const validator = new RequestClass()
  const rules = validator.rules()
  const errors = {}

  for (const [field, ruleString] of Object.entries(rules)) {
    const rulesList = ruleString.split('|')
    for (const rule of rulesList) {
      const error = applyRule(field, req.body?.[field], rule)
      if (error) {
        errors[field] = errors[field] || []
        errors[field].push(error)
      }
    }
  }

  if (Object.keys(errors).length) {
    const err = new Error('Validation failed')
    err.statusCode = 422
    err.errors = errors
    throw err
  }

  return req.body
}
