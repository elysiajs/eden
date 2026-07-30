import { Elysia, problem, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
	.derive(({ headers }) => {
		return {
			authToken: 'q'
		}
	})

const api = treaty<typeof app>('http://localhost:3001')

const response = api.subscribe()

response.subscribe((data) => {
    console.log(data)
})

await Bun.sleep(100)

response.send('Hello from client!')
