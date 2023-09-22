import { Elysia, t } from 'elysia'
import { edenTreaty } from '../src'

class CustomError extends Error {
    constructor(public message: string) {
        super(message)
    }
}

const errorPlugin = new Elysia().error({ CUSTOM_ERROR: CustomError })

const main = new Elysia()
    .use(errorPlugin)
    .get('/', () => ({ name: 'Elysia' }), {
        response: {
            200: t.Object({ name: t.String() })
        }
    })

type App = typeof main
type B = App['schema']['/']

const api = edenTreaty<App>('')

const res = await api.get()
if (res.error) throw res.error
res.data // unknown
