export default async function loggerPlugin({ server }) {
  server.router.use(async (req, res, next) => {
    const startedAt = Date.now()
    res.on('finish', () => {
      console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - startedAt}ms`)
    })
    return next()
  })
}
