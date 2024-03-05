import { Elysia, t } from 'elysia'
import { treaty, edenTreaty } from '../src'

const app = new Elysia()
    .get('/hello', ({ headers }) => {
        return headers
    })
    .listen(3000)

const api = treaty<typeof app>('localhost:3000')

const a = await api.hello.get()

a.data
a.error