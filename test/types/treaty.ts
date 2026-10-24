import { Elysia, t } from 'elysia'
import { edenTreaty } from '../../src'
import type { EdenWS } from '../../src/treaty'

const app = new Elysia().post(
    '/mirror',
    {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    },
    ({ body }) => body
)

const client = edenTreaty<typeof app>('http://localhost:8082')

class Credential {
    toJSON(): { username: string; password: string } {
        return { username: 'saltyaom', password: '12345678' }
    }
}

{
    client.mirror.post(new Credential())

    client.mirror.post({
        username: new Date(),
        password: '12345678'
    })
}

{
    class Money {
        toJSON(): { amount: number; currency: string } {
            return { amount: 1, currency: 'USD' }
        }
    }

    type Socket = EdenWS<{
        body: { amount: number; currency: string }
        headers: unknown
        query: unknown
        params: unknown
        cookie: unknown
        response: unknown
    }>

    const send = (socket: Socket) => socket.send(new Money())
}
