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

const api = treaty(app, {
	parseDate: false
})

const { data, error } = await api.get({
	query: {
		minDate: '2025-01-01',
		maxDate: '2025-01-01'
    }
})

console.log(data, error)
