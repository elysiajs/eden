import { Elysia } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
	.get('', function* () {
		return 'a'
	})

const { data } = await treaty(app).index.get()

data
