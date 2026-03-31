import { Elysia, sse, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
	.get('/generator', async function* () {
		yield 'a'
		yield { 'hello': 'world' }
		yield 1
		yield true
	})

const response = await treaty(app)['~path']

for await (const chunk of response.data!)
	console.log('chunk', chunk)
