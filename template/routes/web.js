export default async function routes(Route) {
  Route.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ framework: 'Backurus', docs: '/docs', websocket: '/ws' }))
  }).name('home')
}
