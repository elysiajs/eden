import { eden } from '@elysia/eden'
import type { Server } from '../../server'

// @ts-ignore
const app = document.querySelector<HTMLDivElement>('#app')!

export const client = eden<Server>('http://localhost:8080')

await client.error.get().then((res) => {
    // Should have type error because error isn't handled yet
    res.myName

    if (res instanceof Error)
        switch (res.status) {
            case 400:
                console.log(res.value.message)

                throw res
        }

    res.myName
})

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
