import { eden } from '@elysia/eden'
import type { Server } from '../../server'

const app = eden<Server>('http://localhost:8080')

const data = await app.fetch('/products/nendoroid/:id', {
    method: 'PUT',
    body: {
        name: 'a'
    },
    params: {
        id: 'a'
    }
})
