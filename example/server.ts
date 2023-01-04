import { Elysia, t, type SCHEMA } from 'elysia'
import { cors } from '@elysiajs/cors'
import { websocket } from '@elysiajs/websocket'

const app = new Elysia()
    .use(cors())
    .use(websocket())
    .get('/', () => 'Elysia')
    .post('/', () => 'Elysia')
    .get('/sign-in', () => 'ok')
    .get('/a/a/:b/:c/d', () => 'Ok')
    .get('/b/:c', () => 'Ok')
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
    .ws('/chat/:room/:name', {
        message(ws, message) {
            ws.send(message)
        },
        schema: {
            body: t.String(),
            response: t.String()
        }
    })
    .listen(8080)

export type Server = typeof app

type B = Server['store'][typeof SCHEMA]
