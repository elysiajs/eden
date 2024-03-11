import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const testRouter = new Elysia()
    .group('/test/:testId', (app) => app.get('/test', () => 'hi'))
    .listen(3005)

const testTreaty = treaty<typeof testRouter>('http://localhost:3005')

console.log(await testTreaty.test({ testId: '1' }).test.get())
// Error: undefined is not an object (evaluating 'testTreaty.test({ testId: "1" }).test.get')
