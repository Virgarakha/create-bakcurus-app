import User from '../app/models/User.js'

test('model hidden columns are removed from serialization', async () => {
  const raw = { id: 1, name: 'Rakha', password: 'secret', deleted_at: '2026-03-11 00:00:00' }
  const out = User.serialize(raw)
  expect(out.password).toBe(undefined)
  expect(out.deleted_at).toBe(undefined)
  expect(out.name).toBe('Rakha')
})

