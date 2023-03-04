import { edenFetch } from '@elysia/eden'
import type { Server } from '../../server'

const fetch = edenFetch<Server>('http://localhost:8080')

const data = await fetch('/products/nendoroid/:id', {
    method: 'PUT',
    body: {
        name: 'a'
    },
    params: {
        id: 'a'
    }
})
