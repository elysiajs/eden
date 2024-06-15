import { Elysia } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/', () => ({
    a: Bun.file('./test/kyuukurarin.mp4')
}))

const api = treaty(app)
const { data, error } = await api.index.get()

if (error) throw error

console.log(data.a.size)
