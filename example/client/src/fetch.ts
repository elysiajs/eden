import { edenFetch } from '@elysia/eden'
import type { Server } from '../../server'

const fetch = edenFetch<Server>('http://localhost:8080')

const d = await fetch('/', {
    method: 'POST'
})

console.log(d)
