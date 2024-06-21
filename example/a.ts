import { Elysia } from 'elysia'
import { treaty } from '../src'

new Elysia().get('/', 'stuff').listen(4000)

const a = treaty('http://localhost:4000', {
    onRequest: (path, options) => {
        return {
            headers: {
                Authorization: `Bearer stuff`
            }
        }
    }
})

a.index.get()

