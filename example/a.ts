import { Elysia, problem } from 'elysia'
import { createPlugin, treaty } from '../src'

class Error1 extends Error {}
class Error2 extends Error {}

const app = new Elysia()
	.error(Error1, () => problem(400, { detail: 'q' }))
	.error(Error2, () => problem(401, { detail: 'q' }))
	.get('/', () => {
		if (Math.random() > 0.25) return new Error1()
		if (Math.random() > 0.25) return new Error2()

		return 'ok' as const
	})
	.get('/id', () => {
		if (Math.random() > 0.25) return new Error1()
		if (Math.random() > 0.25) return new Error2()

		return 'ok' as const
	})

const pl = createPlugin({
	name: 'sync',
	verbs: {
		live(context, options?: { query?: { list?: string } }) {
			if (context.path === '/id') return

			return 'a'
		}
	}
})

const a = treaty(app).use(pl)

a.id.live()
