import { edenTreaty } from '../src'
import type { Server } from './server'

const treaty = edenTreaty<Server>('http://localhost:8080')

const { data, error } = await treaty.products.nendoroid[1902].put({
    name: 'Anya Forger'
})

if(error)
    switch(error.status) {
        case 400:
        case 401:
            break
    }

if(data) {
    console.log(data)
}

const ws = await treaty.ws.mirror.subscribe()

ws.subscribe((message) => {
    console.log(message)
})

setInterval(() => {
    ws.send('hello')
}, 200)
