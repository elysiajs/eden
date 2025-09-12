import { Elysia } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/test', function* a() {
	yield 'a'
	yield 'b'
})

const client = treaty(app)

const { data } = await client.test.get()

for await (const d of data!) {

}

console.log(data)
