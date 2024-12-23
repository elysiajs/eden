import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
	.get('/error', ({ error }) => error("I'm a teapot", 'Kirifuji Nagisa'), {
		response: {
			200: t.Void(),
			418: t.Literal('Kirifuji Nagisa'),
			420: t.Literal('Snoop Dogg')
		}
	})
	.listen(3000)

app._routes.error

const a = treaty(app)

const { data, error } = await a.error.get()

console.log(data?.image)
