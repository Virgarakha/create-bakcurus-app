import { ResponseFactory } from '../core/response.js'

function createMockRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[String(key).toLowerCase()] = value
    },
    end(payload) {
      this.body = payload
    }
  }
  return res
}

test('res.collection returns success payload with meta', async () => {
  const res = createMockRes()
  new ResponseFactory().attach(res)
  res.collection([{ id: 1 }], { count: 1 }, 'OK')
  const json = JSON.parse(res.body)
  expect(json.status).toBe('success')
  expect(json.code).toBe(200)
  expect(json.meta.count).toBe(1)
  expect(json.data.length).toBe(1)
})

test('res.custom returns payload as-is', async () => {
  const res = createMockRes()
  new ResponseFactory().attach(res)
  res.custom({ hello: 'world' }, 202)
  const json = JSON.parse(res.body)
  expect(res.statusCode).toBe(202)
  expect(json.hello).toBe('world')
})

