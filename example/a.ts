import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().post('/prefix/:id', ({ body }) => body, {
    body: t.Object({
        username: t.String()
    })
})

const api = treaty(app, {
    headers(path, options) {
        if (path.startsWith('/user'))
            return {
                authorization: 'Bearer 12345'
            }
    },
    onRequest: (path, options) => {
        if (!path.startsWith('/user')) return

        const controller = new AbortController()
        options.signal = controller.signal

        setTimeout(() => controller.abort(), 3000)
    },
    onResponse: [
        (response) => {
            if (response.headers.get('content-type') !== 'application/json')
                return

            return response.json()
        }
    ]
})

const { data, error: err } = await api.prefix({ id: '1' }).post({
    username: 'a'
})

console.log(data)
