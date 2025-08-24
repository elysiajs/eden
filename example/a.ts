import { Elysia } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().post('/test', () => {
    return {
        a: new Date()
    }
})

const client = treaty(app)

const { data } = await client.test.post({}, {
    headers: {
        'content-type': 'application/json!'
    }
})

console.log(data)
