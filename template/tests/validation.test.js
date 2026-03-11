import { sanitize, validate } from '../core/validator.js'

test('nested object validation', async () => {
  const data = { user: { name: 'Rakha', email: 'rakha@email.com' } }
  const rules = {
    'user.name': 'required|alpha_spaces|min:3',
    'user.email': 'required|email'
  }
  const out = await validate(data, rules)
  expect(out.user.name).toBe('Rakha')
})

test('array wildcard validation', async () => {
  const data = { tags: ['node', 'backend', 'api'] }
  const rules = {
    tags: 'array',
    'tags.*': 'string|min:2'
  }
  const out = await validate(data, rules)
  expect(out.tags.length).toBe(3)
})

test('conditional required_if validation', async () => {
  const data = { role: 'admin' }
  const rules = { role: 'required', admin_code: 'required_if:role,admin' }
  let threw = false
  try {
    await validate(data, rules)
  } catch (e) {
    threw = true
    expect(Boolean(e.errors?.admin_code)).toBeTruthy()
  }
  expect(threw).toBeTruthy()
})

test('sanitization helper', async () => {
  const data = { name: '  Rakha  ', email: 'RAKHA@EMAIL.COM', username: 'Hello World' }
  const out = sanitize(data, { name: 'trim', email: 'trim|lowercase', username: 'slug' })
  expect(out.name).toBe('Rakha')
  expect(out.email).toBe('rakha@email.com')
  expect(out.username).toBe('hello-world')
})

test('file validation: image dimensions + mimes + max', async () => {
  // Minimal PNG with IHDR width/height at bytes 16-23
  const png = Buffer.alloc(24)
  png.writeUInt32BE(0x89504e47, 0) // PNG signature start
  png.writeUInt32BE(200, 16) // width
  png.writeUInt32BE(150, 20) // height

  const files = {
    avatar: {
      originalName: 'avatar.png',
      mimetype: 'image/png',
      size: 100 * 1024,
      buffer: png
    }
  }

  const rules = {
    avatar: 'required|file|image|mimes:png,jpg|max:2048|dimensions:min_width=100,min_height=100'
  }

  const out = await validate({}, rules, null, { files })
  expect(out).toBeTruthy()
})

