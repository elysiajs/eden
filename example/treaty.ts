import { edenTreaty } from '../src'
import type { Server } from './server'

const eden = edenTreaty<Server>('http://localhost:8080')

const { data, error } = await eden.products.nendoroid[1931].put({
    name: 'A'
})

const a = eden['union-type'].get()

if (error)
    switch (error.status) {
        case 400:
        case 401:
            break
    }

if (data) {
    console.log(data)
}

const ws = await eden.ws.mirror.subscribe()

ws.subscribe((message) => {
    console.log(message)
})

setInterval(() => {
    ws.send('hello')
}, 200)
