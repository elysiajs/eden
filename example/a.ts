import { Elysia, t } from 'elysia'

const app = new Elysia()
    .model('signIn', t.Object({ name: t.String() }))
    .get('/', ({ body }) => 'a', {
        body: 'signIn',
        response: t.String()
    })
