import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/foo/:id', ({ params: { id } }) => {
    return `ID is ${id}`
})

const api = treaty(app)

await api.foo({ id: 999 }).get().then(console.log)
