import { edenTreaty } from '../src'
import type { Server } from './server'

const treaty = edenTreaty<Server>('http://localhost:8080')

const a = await treaty.ws.mirror.subscribe()

a.on("message", (a) => {
    const b = a
})