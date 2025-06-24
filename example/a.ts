import { Elysia } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
	.get('/', () => 'hi')

const api = treaty(app)

await api.get()
