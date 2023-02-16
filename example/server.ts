import { Elysia, t } from 'elysia'
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
    .setModel({
        success: t.Object({
            success: t.Boolean(),
            data: t.String()
        }),
        fail: t.Object({
            success: t.Boolean(),
            data: t.Null()
        })
    })
    .get(
        '/union-type',
        () => {
            return {
                success: true,
                data: null
            }
        },
        {
            schema: {
                response: {
                    200: 'success',
                    400: 'fail'
                }
            }
        }
    )
    .expose({
        mirror: async <T>(a: T) => a
    })
    .expose(({ permission }) => ({
        authorized: permission({
            value: () => 'authorized',
            allow({ request: { headers } }) {
                if (!headers.has('Authorization'))
                    throw new Error('Authorization is required')
            }
        })
    }))
    .listen(8080)

export type Server = typeof app
