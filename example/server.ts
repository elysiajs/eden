import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
    .get('/', () => 'Elysia')
    .post('/', () => 'Elysia', {
        schema: {
            body: t.Object({
                id: t.Number()
            })
        }
    })
    .get('/id/:id', () => 1)
    .get(
        '/error',
        ({ set }) => {
            set.status = 400

            return {
                error: true,
                message: 'Something'
            }
        },
        {
            schema: {
                response: {
                    200: t.Object({
                        myName: t.String()
                    }),
                    400: t.Object({
                        error: t.Boolean(),
                        message: t.String()
                    })
                }
            }
        }
    )
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
        ({ body: { name }, params: { id } }) => ({
            name,
            id
        }),
        {
            schema: {
                body: t.Object({
                    name: t.String()
                }),
                response: {
                    200: t.Object({
                        name: t.String(),
                        id: t.String()
                    }),
                    400: t.Object({
                        error: t.String(),
                        name: t.String(),
                        id: t.String()
                    })
                }
            }
        }
    )
    .group('/group', (app) => app.get('/in', () => 'Hi'))
    // .ws('/ws/mirror', {
    //     schema: {
    //         body: t.String(),
    //         response: t.String()
    //     },
    //     message(ws, message) {
    //         ws.send(message)
    //     }
    // })
    // .ws('/chat/:room/:name', {
    //     message(ws, message) {
    //         ws.send(message)
    //     },
    //     schema: {
    //         body: t.String(),
    //         response: t.String()
    //     }
    // })
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
    .fn({
        mirror: async <T>(a: T) => a
    })
    .fn(({ permission }) => ({
        authorized: permission({
            value: () => 'authorized',
            check({ request: { headers } }) {
                if (!headers.has('Authorization'))
                    throw new Error('Authorization is required')
            }
        })
    }))

app
    // @ts-ignore
    .use(cors())
    .listen(8080)

export type Server = typeof app
