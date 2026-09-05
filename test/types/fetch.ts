import { Elysia, t } from 'elysia'
import { edenFetch } from '../../src'

const app = new Elysia().post(
    '/pay',
    {
        body: t.Object({
            amount: t.Number(),
            currency: t.String()
        })
    },
    ({ body }) => body
)

const fetch = edenFetch<typeof app>('http://localhost:3000')

class Money {
    toJSON(): { amount: number; currency: string } {
        return { amount: 1, currency: 'USD' }
    }
}

{
    fetch('/pay', {
        method: 'POST',
        body: new Money()
    })
}

{
    class WrongShape {
        toJSON(): string {
            return 'x'
        }
    }

    fetch('/pay', {
        method: 'POST',
        // @ts-expect-error
        body: new WrongShape()
    })
}
