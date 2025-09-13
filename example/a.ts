import { Elysia } from 'elysia'
import { treaty } from '../src'

const authMacro = new Elysia().macro({
    auth: {
        async resolve() {
            return { newProperty: 'Macro added property' }
        }
    }
})

const routerWithMacro = new Elysia()
    .use(authMacro)
    .get('/bug', 'Problem', { auth: true })

const routerWithoutMacro = new Elysia().get('/noBug', 'No Problem')

const app = new Elysia().use(routerWithMacro).use(routerWithoutMacro)

const api = treaty<typeof app>('localhost:3000')

api.noBug.get()

api.bug.get()
