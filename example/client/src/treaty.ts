import { edenTreaty } from '@elysia/eden'
import type { Server } from '../../server'

export const client = edenTreaty<Server>('http://localhost:8080')

const { data: skadi } = await client.products.nendoroid.skadi.get()

const { data, error } = await client.products.nendoroid['1902'].put({
    name: 'Anya Forger'
})

if (!error) console.log(data)

const mirror = client.ws.mirror.subscribe()

mirror.subscribe(({ data }) => {
    mirror.send(data)
})

const chat = client.chat.subscribe({
    $query: {
        name: 'A',
        room: 'C'
    }
})
chat.subscribe(({ data }) => {
    chat.send(data.message)
})

setInterval(() => {
    mirror.send('a')
}, 200)
