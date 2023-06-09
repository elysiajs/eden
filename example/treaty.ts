import { SCHEMA } from 'elysia'
import { edenTreaty } from '../src'
import type { Server } from './server'

const eden = edenTreaty<Server>('http://localhost:8080')

const { data, error } = await eden.products.nendoroid[1902].put({
    $query: undefined,
    name: 'Anya Forger'
})

type B = Server['meta'][typeof SCHEMA]['/query']['post']

const a = await eden.query.post({
    name: 'A'
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
