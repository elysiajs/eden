import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
    .use(cors())
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
    .listen(8080)

export type Server = typeof app
