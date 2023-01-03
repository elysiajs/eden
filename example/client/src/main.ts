import type { Server } from '../../server'
import { eden } from '@elysia/eden'

import './style.css'

// @ts-ignore
const app = document.querySelector<HTMLDivElement>('#app')!

const client = eden<Server>('http://localhost:8080')

const chat = client.ws.mirror
    .subscribe()
    .on('open', () => {
        chat.send('hi')
    })
    .on('message', ({ data }) => {
        console.log('Got', data)
    })

// REST
client.products.nendoroid
    .POST({
        id: 1895,
        name: 'Skadi'
    })
    .then((result) => {
        app.textContent = `${result.id} ${result.name}`
    })
    .catch((error) => {
        app.textContent = error.message
    })
