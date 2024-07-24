import { treaty } from '../src'
import type { Server } from './server'

const eden = treaty<Server>('http://localhost:8080')

const a = await eden.products.nendoroid.skadi.get({
    query: {
        username: 'a',
        filter: {
            name: 'b',
            address: 'c',
            age: '10'
        }
    }
})

// console.log(a)

console.log(await eden.array.post('hi'))
