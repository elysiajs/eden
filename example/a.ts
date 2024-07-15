import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const a = new Elysia().get(
	'/id/:id?',
	({ params: { id } }) => id)

treaty(a).id({ id: '1' }).get().then(console.log)
treaty(a).id.get().then(console.log)

// a.handle(new Request('http://localhost/error')).then(x => x.status).then(console.log)

// const api = treaty(a)

// const { data, error, response } = await api.error.get()

// console.log(data, error, response)
