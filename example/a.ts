import { Elysia, problem, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().patch(
    '/product/:id',
    {
        body: t.Object({
            name: t.Optional(t.String()),
            variants: t.Optional(
                t.Array(
                    t.Object({
                        price: t.Number({ minimum: 0 }),
                        weight: t.Number({ minimum: 0 })
                    })
                )
            ),
            metadata: t.Optional(
                t.Object({
                    category: t.String(),
                    tags: t.Array(t.String()),
                    inStock: t.Boolean()
                })
            ),
            image: t.Optional(t.File({ type: 'image' }))
        })
    },
    ({ body, params }) => ({
        id: params.id,
        ...body
    })
)

const client = treaty(app)

const query = { username: null }

const { data, error } = await client.product({ id: '123' }).patch({
    name: 'q'
})

console.log(data)

console.log(error?.value)
