import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/headers', ({ headers }) => headers, {
    headers: t.Object({
        username: t.String(),
        alias: t.Literal('Kristen')
    })
})

const api = treaty(app, {
    headers: [
        () => {
            return {
                alias: 'Kristen'
            }
        }
    ]
})

const { data, error } = await api.headers.get({
    headers: {
        username: 'a'
    }
})

// console.log(data)
