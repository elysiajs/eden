import { eden } from '@elysia/eden/dist/legacy'
import type { Server } from '../../server'

// @ts-ignore
const app = document.querySelector<HTMLDivElement>('#app')!

export const client = eden<Server>('http://localhost:8080')

client.products.nendoroid[':id'].put({
    name: 'a'
})

await client.error.get()

await client.mirror.post({
    password: 'a',
    username: 'a'
})

// const chat = client.ws.mirror
//     .subscribe()
//     .on('open', () => {
//         chat.send('hi')
//     })
//     .on('message', ({ data }) => {
//         console.log('Got', data)
//     })

client.mirror
    .post({
        username: 'A',
        password: 'b'
    })
    .then((a) => {
        console.log(a)
    })

// REST
client.products.nendoroid
    .post({
        id: 1895,
        name: 'Skadi'
    })
    .then((result) => {
        app.textContent = `${result.id} ${result.name}`
    })
    .catch((error) => {
        app.textContent = error.message
    })
