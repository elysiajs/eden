import { Elysia } from 'elysia'

const encoder = new TextEncoder()

new Elysia()
    .mapResponse(({ response, set }) => {
        const isJson = typeof response === 'object'

        const text = isJson
            ? JSON.stringify(response)
            : response?.toString() ?? ''

        set.headers['Content-Encoding'] = 'gzip'

        return new Response(
            Bun.gzipSync(encoder.encode(text)),
            {
                headers: {
                    'Content-Type': `${
                        isJson ? 'application/json' : 'text/plain'
                    }; charset=utf-8`
                }
            }
        )
    })
    .get('/text', () => 'mapResponse')
    .get('/json', () => ({ map: 'response' }))
    .listen(3000)
