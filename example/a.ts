import { Elysia, sse, t } from 'elysia'
import { treaty } from '../src'


const app = new Elysia().get(
	'/profile',
	({ headers }) => headers.authorization,
	{
		headers: t.Object({
			authorization: t.String()
		})
	}
)

const api = treaty(app, {
	headers: {
		authorization: 'Hello'
	}
})

api.profile.get({
	headers: {
		authorization: 'Authorization'
	}
})
