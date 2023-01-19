import { Elysia, t, type SCHEMA } from 'elysia'
import { cors } from '@elysiajs/cors'
import { websocket } from '@elysiajs/websocket'

const app = new Elysia()
    .use(cors())
    .use(websocket())
    .get('/', () => 'Elysia')
    .post('/', () => 'Elysia')
    .get('/id/:id', () => 1)
    .post('/mirror', ({ body }) => body, {
        schema: {
            body: t.Object({
                username: t.String(),
                password: t.String()
            })
        }
    })
    .get('/sign-in', () => 'ok')
    .get('/products/nendoroid/skadi', () => 1)
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
    .group('/group', (app) => app.get('/in', () => 'Hi'))
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
