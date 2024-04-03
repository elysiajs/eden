import { edenTreaty, treaty } from '../src'

import { Elysia, error, t } from 'elysia'

const app = new Elysia()
    .post('/json', ({ body }) => body)

type app = typeof app

const api = treaty(app)

api.json.post({ hello: 'world' }).then(console.log)
