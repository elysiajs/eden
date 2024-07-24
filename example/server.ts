import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
    .use(cors())
    .get('/something/here', () => 'Elysia')
    .post('/array', ({ body }) => body, {
        body: t.String()
    })
    .post('/query', async () => 'There', {
        body: t.Object({
            name: t.String()
        }),
        query: t.Object({
            username: t.String()
        })
    })
    .put('/query', async () => 'There', {
        body: t.Object({
            namea: t.String()
        }),
        query: t.Object({
            username: t.String()
        })
    })
    .post('/', () => 'A')
    .post('/image', ({ body: { image, title } }) => title, {
        body: t.Object({
            image: t.Files(),
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
    .get(
        '/products/nendoroid/skadi',
        ({ query }) => {
            console.log({ query })
            return query
        },
        {
            query: t.Object({
                username: t.String(),
                filter: t.Object({
                    name: t.Optional(t.String()),
                    address: t.Optional(t.String()),
                    age: t.Optional(t.String())
                })
            }),
            response: {
                200: t.Object({
                    username: t.String(),
                    filter: t.Object({
                        name: t.Optional(t.String()),
                        address: t.Optional(t.String()),
                        age: t.Optional(t.String())
                    })
                })
            }
        }
    )
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

export type Server = typeof app
