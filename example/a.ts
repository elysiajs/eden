import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
    .get('/headers', ({ headers }) => headers, {
        headers: t.Object({
            username: t.String(),
            alias: t.Literal('Kristen')
        })
    })
    .ws('/ws', {
        open({ data, send }) {
            console.log(data)
        },
        message({ data, send }) {
        }
    })
    .listen(3000)

const api = treaty<typeof app>('localhost:3000')

api.ws.subscribe({ query: { username: 'Aly', room: '123' } })

// const { data, error } = await api.headers.get({
//     headers: {
//         username: 'a',
//         alias: 'Kristen'
//     }
// })

// console.log(data)
