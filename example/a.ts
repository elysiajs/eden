import { Elysia } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/', function* () {
    for (let i = 0; i < 1000; i++) 
        yield i
})

const client = treaty(app)

const { data, error } = await client.index.get()

for await (const chunk of data!)
    console.log(chunk)
