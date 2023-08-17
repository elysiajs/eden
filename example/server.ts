import { Elysia, ws, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import SuperJSON from 'superjson'
// import fn from '@elysiajs/fn'

const app = new Elysia()
    .use(ws())
    .use(cors())
    .get('/something/here', () => 'Elysia')
    .post('/query', async () => 'There', {
        body: t.Object({
            name: t.String()
        }),
        query: t.Object({
            username: t.String()
        })
    })
    .post('/', () => 'A')
    .post('/image', ({ body: { image, title } }) => title, {
        body: t.Object({
            image: t.File(),
            title: t.String()
        })
    })
    .post('/', () => 'Elysia')
    .post('/name/:name', () => 1)
    .post('/a/bcd/:name/b', () => 1)
    .post('/id/here', () => 1)
    .post('/id/here/a', () => 1)
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
    )
    .post('/mirror', ({ body }) => body, {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })
    .get('/sign-in', () => 'ok')
    .get('/products/nendoroid/skadi', () => 1, {
        query: t.Object({
            username: t.String()
        })
    })
    .post('/products/nendoroid/skadi', () => 1, {
        body: t.Object({
            username: t.String()
        })
    })
    .post('/products/nendoroid', ({ body }) => body, {
        body: t.Object({
            id: t.Number(),
            name: t.String()
        })
    })
    .put(
        '/products/nendoroid/:id',
        ({ body: { name }, params: { id } }) => ({
            name,
            id
        }),
        {
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
    )
    .group('/group', (app) => app.get('/in', () => 'Hi'))
    .ws('/ws/mirror', {
        body: t.String(),
        response: t.String(),
        message(ws, message) {
            ws.send(message)
        }
    })
    .ws('/chat/:room/:name', {
        message(ws, message) {
            ws.send(message)
        },
        body: t.String(),
        response: t.String()
    })
    .model({
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
            response: {
                200: 'success',
                400: 'fail'
            }
        }
    )
    // .use(async (app) => {
    //     return fn({
    //         app,
    //         value: {
    //             mirror: async <T>(a: T) => {
    //                 return a
    //             },
    //             authorized: permission({
    //                 value: {
    //                     a: (a: string) => {},
    //                     b: () => {}
    //                 },
    //                 check({ key, request: { headers }, match }) {
    //                     if (!headers.has('Authorization'))
    //                         throw new Error('Authorization is required')

    //                     return match({
    //                         a(param) {},
    //                         default() {}
    //                     })
    //                 }
    //             })
    //         }
    //     })
    // })
    // .fn(({ permission }) => ({
    //     mirror: async <T>(a: T) => a,
    //     authorized: permission({
    //         value: {
    //             a: (a: string) => {},
    //             b: () => {}
    //         },
    //         check({ key, request: { headers }, match }) {
    //             if (!headers.has('Authorization'))
    //                 throw new Error('Authorization is required')

    //             return match({
    //                 a(param) {},
    //                 default() {}
    //             })
    //         }
    //     })
    // }))
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
    })
    .listen(8080)

const runFn = (
    body: Array<{ n: string[] } | { n: string[]; p: any[] }>,
    headers: HeadersInit = {},
    target: Elysia<any, any> = app as Elysia<any, any>
): Promise<unknown[]> =>
    app
        .handle(
            new Request('http://localhost/~fn', {
                method: 'POST',
                headers: {
                    'content-type': 'elysia/fn',
                    ...headers
                },
                body: SuperJSON.stringify(body)
            })
        )
        .then((x) => x.text())
        .then((x) => SuperJSON.parse(x))

export type Server = typeof app
