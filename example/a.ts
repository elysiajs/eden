import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
    .group('/test/:testId', (app) => app.get('/test', () => 'hi'))
    .listen(3000)

const api = treaty(app)

console.log(await api.test({ testId: '1' }).test.get())
