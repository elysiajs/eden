import { edenTreaty } from '@elysia/eden'
import type { Server } from '../../server'

export const client = edenTreaty<Server>('http://localhost:8080')

const data2 = await client.products.nendoroid.skadi.get({
    $query: {
        username: 'A'
    }
})

const data = await client.products.nendoroid.skadi.post({
    username: 'A'
})

// const { data, error } = await client.products.nendoroid['1902'].put({
//     name: 'Anya Forger'
// })

// if (!error) console.log(data)

// const mirror = client.ws.mirror.subscribe()

// mirror.subscribe(({ data }) => {
//     mirror.send(data)
// })

// const chat = client.chat.subscribe({
//     $query: {
//         name: 'A',
//         room: 'C'
//     }
// })
// chat.subscribe(({ data }) => {
//     chat.send(data.message)
// })

// setInterval(() => {
//     mirror.send('a')
// }, 200)

const aa = () => {}
type A = typeof aa

type B = A

export const a = {} as {
    a: B
}
