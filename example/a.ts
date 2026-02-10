import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get(
    '/profile',
    ({ headers }) => ({ user: 'hello', token: headers.authorization }),
    {
        // <- enforce that Authorization must be present
        headers: t.Object({
            authorization: t.String()
        })
    }
)

const api = treaty(app, {
    headers: {
        authorization: ''
    }
})
type api = typeof api

const { status } = await api.profile.get({
    headers: {}
})
