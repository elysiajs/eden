import { eden } from '@elysia/eden'
import type { Server } from '../../server'

// @ts-ignore
const app = document.querySelector<HTMLDivElement>('#app')!

export const client = eden<Server>('http://localhost:8080')

await client.error
    .get()
    .then((res) => {
        // If error, this block won't be executed
        console.log(res)
    })
    .catch((error) => {
        // Get error value by using `error.message`
        // If is JSON, you need to parse one yourself,
        // because Error.message is expected to be a string.
        console.log(JSON.parse(error.message))
    })

// await client.mirror.post({
//     password: 'a',
//     username: 'a'
// })

// const chat = client.ws.mirror
//     .subscribe()
//     .on('open', () => {
//         chat.send('hi')
//     })
//     .on('message', ({ data }) => {
//         console.log('Got', data)
//     })

// client.mirror
//     .post({
//         username: 'A',
//         password: 'b'
//     })
//     .then((a) => {
//         console.log(a)
//     })

// // REST
// client.products.nendoroid
//     .post({
//         id: 1895,
//         name: 'Skadi'
//     })
//     .then((result) => {
//         app.textContent = `${result.id} ${result.name}`
//     })
//     .catch((error) => {
//         app.textContent = error.message
//     })
