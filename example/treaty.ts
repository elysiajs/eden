import { SCHEMA } from 'elysia'
import { edenTreaty } from '../src'
import type { Server } from './server'

const eden = edenTreaty<Server>('http://localhost:8080')

type A = Server['meta'][typeof SCHEMA]['/query']

const { data, error } = await eden.products.nendoroid[1902].put({
    name: 'Anya Forger'
})

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
