import { Elysia } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/test', () => {
	return {
		a: new Date()
	}
})

const client = treaty(app)

const { data } = await client.test.get()

console.log(data)
