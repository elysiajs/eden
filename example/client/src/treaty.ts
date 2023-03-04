import { edenTreaty } from '@elysia/eden'
import type { Server } from '../../server'

export const client = edenTreaty<Server>('http://localhost:8080')

const a = await client.index.post({
    id: 1
})

console.log(a)