import { Elysia, sse, t } from 'elysia'
import { treaty } from '../src'

const model = t.Object({
    value: t.Number()
})

const app = new Elysia()
    .get('/', ({ query }) => query, {
        query: t.Object({
            minDate: t.Date(),
            maxDate: t.Date()
        })
    })
    .listen(3000)

const api = treaty(app)

const { data, error } = await api.get({
	query: {
		minDate: new Date(),
		maxDate: new Date()
    }
})

console.log(data, error)
