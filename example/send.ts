import { SCHEMA, EXPOSED } from 'elysia'

import { eden } from '../src/legacy'
import type { Server } from './server'

const app = eden<Server>('http://localhost:8080')

const handle = async () => {
    const user = await app.error.get()
}
