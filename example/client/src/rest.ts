import { eden } from '@elysia/eden'
import type { Server } from '../../server'

export const client = eden<Server>('http://localhost:8080')

// @ts-ignore
const app = document.querySelector<HTMLDivElement>('#app')!

// REST
await client.mirror.post({
    password: 'a',
    username: 'a'
})

const chat = client.ws.mirror
    .subscribe()
    .on('open', () => {
        chat.send('hi')
    })
    .on('message', ({ data }) => {
        console.log('Got', data)
    })

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
