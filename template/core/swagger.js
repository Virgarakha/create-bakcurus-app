export function createSpec(router) {
  const paths = {}
  for (const route of router.docs) {
    paths[route.path] = paths[route.path] || {}
    paths[route.path][route.method.toLowerCase()] = {
      responses: {
        200: { description: 'Successful response' }
      }
    }
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'Rapid API Framework',
      version: '1.0.0'
    },
    paths
  }
}

function renderHtml(spec) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ spec: ${JSON.stringify(spec)}, dom_id: '#swagger-ui' })
    }
  </script>
</body>
</html>`
}

export function registerDocsRoute(router) {
  router.get('/docs.json', async (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(createSpec(router)))
  })

  router.get('/docs', async (req, res) => {
    res.setHeader('Content-Type', 'text/html')
    res.end(renderHtml(createSpec(router)))
  })
}
