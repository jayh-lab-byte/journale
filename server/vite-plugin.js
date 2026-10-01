import { nodeBridge } from './node-bridge.js'

export function apiPlugin() {
  return {
    name: 'journale-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api')) return next()
        try {
          await nodeBridge(req, res)
        } catch (error) {
          console.error(error instanceof Error ? error.message : 'API error')
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } }))
          }
        }
      })
    },
  }
}
