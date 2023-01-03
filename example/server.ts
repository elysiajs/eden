import { Elysia, t, type SCHEMA } from 'elysia'
import { websocket } from '@elysiajs/websocket'

const app = new Elysia()
    .use(websocket())
    .get('/', () => 'Elysia')
    .post('/', () => 'Elysia')
    .get('/sign-in', () => 'ok')
    .post('/products/nendoroid', ({ body }) => body, {
        schema: {
            body: t.Object({
                id: t.Number(),
                name: t.String()
            })
        }
    })
    .put(
        '/products/nendoroid/:id',
        ({ body, params: { id } }) => ({
            ...body,
            id
        }),
        {
            schema: {
                body: t.Object({
                    name: t.String()
                })
            }
        }
    )
    .ws('/ws/mirror', {
        schema: {
            body: t.String(),
            response: t.String()
        },
        message(ws, message) {
            ws.send(message)
        }
    })
    .listen(8080)

export type Server = typeof app

type B = Server['store'][typeof SCHEMA]
