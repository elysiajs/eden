import { SCHEMA, EXPOSED } from 'elysia'

import { eden } from '../src'
import type { Server } from './server'

const app = eden<Server>('http://localhost:8080/')

const handle = async () => {
    const user = await app.error.get()

    if (user instanceof Error)
        switch (user.status) {
            case 301:
                console.log(user.value)
                break

            case 400:
                console.log(user.value)
                break

            case 418:
                console.log(user.value)
                break

            default:
                break
        }
}
