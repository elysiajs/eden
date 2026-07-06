import { Elysia, problem } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/', async function* () {
    return problem(418, {
        details: 'I am a teapot'
    })
})

const response = await treaty(app).get()

console.log(response.error)
