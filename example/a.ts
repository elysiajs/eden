import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
    .get('/hello', ({ headers, error }) => {
        if (Math.random()) return error(418, 'a')
        if (Math.random()) return error(420, 'b')

        return "A"
    })
    .listen(3000)

const api = treaty<typeof app>('localhost:3000')

type Res = typeof app._routes.hello.get.response
type B = Exclude<keyof Res, 200> extends number ? true : false

const a = await api.hello.get()

a.data
a.error
