import { Elysia, ws, t, SCHEMA } from 'elysia'
import { cors } from '@elysiajs/cors'
import '@elysiajs/fn'

const app = new Elysia()
    .use(ws())
    .use(cors())
    .get('/something/here', () => 'Elysia')
    .post('/', () => 'A')
    .post('/image', ({ body: { image } }) => image.size, {
        schema: {
            body: t.Object({
                image: t.File()
            })
        }
    })
    .post('/', () => 'Elysia')
    .post('/name/:name', () => 1)
    .post('/a/bcd/:name/b', () => 1)
    .post('/id/here', () => 1)
    .post('/id/here/a', () => 1)
    // .get(
    //     '/error',
    //     ({ set }) => {
    //         set.status = 400

    //         return {
    //             error: true,
    //             message: 'Something'
    //         }
    //     },
    //     {
    //         schema: {
    //             response: {
    //                 200: t.Object({
    //                     myName: t.String()
    //                 }),
    //                 400: t.Object({
    //                     error: t.Boolean(),
    //                     message: t.String()
    //                 })
    //             }
    //         }
    //     }
    // )
    // .post('/mirror', ({ body }) => body, {
    //     schema: {
    //         body: t.Object({
    //             username: t.String(),
    //             password: t.String()
    //         })
    //     }
    // })
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
                    }),
                    401: t.Object({
                        error: t.String(),
                        name: t.String(),
                        id: t.String()
                    })
                }
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
    .fn(({ permission }) => ({
        mirror: async <T>(a: T) => a,
        authorized: permission({
            value: {
                a: (a: string) => {},
                b: () => {}
            },
            check({ key, request: { headers }, match }) {
                if (!headers.has('Authorization'))
                    throw new Error('Authorization is required')

                return match({
                    a(param) {},
                    default() {}
                })
            }
        })
    }))
    .ws('/chat', {
        open(ws) {
            const { room, name } = ws.data.query

            ws.subscribe(room).publish(room, {
                message: `${name} has enter the room`,
                name: 'notice',
                time: Date.now()
            })
        },
        message(ws, message) {
            const { room, name } = ws.data.query

            ws.publish(room, {
                message,
                name,
                time: Date.now()
            })
        },
        close(ws) {
            const { room, name } = ws.data.query

            ws.publish(room, {
                message: `${name} has leave the room`,
                name: 'notice',
                time: Date.now()
            })
        },
        schema: {
            body: t.String(),
            query: t.Object({
                room: t.String(),
                name: t.String()
            }),
            response: t.Object({
                message: t.String(),
                name: t.String(),
                time: t.Number()
            })
        }
    })
    .listen(8080)

await app.modules

export type Server = typeof app
