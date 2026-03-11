import { Router } from '../core/router.js'

test('router group applies prefix', async () => {
  const router = new Router()
  router.group({ prefix: '/api/v1' }, (Route) => {
    Route.get('/users', async () => {})
  })
  expect(router.routes[0].routePath).toBe('/api/v1/users')
})

test('route throttle injects middleware handler', async () => {
  const router = new Router()
  router.post('/login', async () => {}).throttle(10, 60)
  expect(typeof router.routes[0].handlers[0]).toBe('function')
})

