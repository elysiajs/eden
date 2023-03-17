import { edenTreaty } from '@elysia/eden'
import type { Server } from '../../server'

export const client = edenTreaty<Server>('http://localhost:8080')

client.products.nendoroid[':id']

const { data, error } = await client.products.nendoroid['1902'].put({
    name: 'Anya Forger'
})

if (!error) console.log(data)

const mirror = client.ws.mirror.subscribe()

setInterval(() => {
    mirror.send('a')
}, 200)
