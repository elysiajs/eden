import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/search/index/:indexId/stocks', () => ({
    data: []
}))

const api = treaty(app)
type api = typeof api

const { status } = await api.search.index({ indexId: 'a' }).stocks.get()
