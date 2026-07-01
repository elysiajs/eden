import { Elysia } from 'elysia'
import { Treaty, treaty } from '../src'

const app = new Elysia().get('/', () => ({
    a: Bun.file('./test/public/kyuukurarin.mp4')
}))

type a = Treaty.TreatyResponse<{
    200: {
        a: string
    }
}>

const api = treaty(app)
const { data, error } = await api.get()

if (error) throw error

console.log(data.a.size)
