import { Auth } from 'backurus'
import { runWithRequestContext } from 'backurus/core/request-context'

test('Auth reads user from request context', async () => {
  const req = { headers: {}, user: { id: 123, email: 'a@b.com' } }
  await runWithRequestContext({ req }, async () => {
    expect(Auth.check()).toBe(true)
    expect(Auth.guest()).toBe(false)
    expect(Auth.id()).toBe(123)
    expect(Auth.user()).toEqual({ id: 123, email: 'a@b.com' })
  })
})

test('Auth resolves token from bearer header', async () => {
  const req = { headers: { authorization: 'Bearer abc.def.ghi' } }
  await runWithRequestContext({ req }, async () => {
    expect(String(Auth.token())).toBe('abc.def.ghi')
    expect(Auth.check()).toBe(false)
    expect(Auth.guest()).toBe(true)
    expect(Auth.id()).toBe(null)
    expect(Auth.user()).toBe(null)
  })
})
