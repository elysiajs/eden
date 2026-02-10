import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/query', ({ query }) => query, {
    query: t.Object({
        orderBy: t.Array(
            t.Object({
                column: t.String()
            })
        )
    })
})

const api = treaty(app)

const { data } = await api.query.get({
    query: {
        orderBy: [
            {
                column: 'finalizedAt'
            }
        ]
    }
})

console.log(data)
