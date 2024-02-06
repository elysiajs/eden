import { edenTreaty } from '../src'

import { Elysia, error, t } from 'elysia'

const app = new Elysia()
    .get('/', 'a')
    .post('/', 'a')
    .post('/hello/landing', 'a')
    .post(
        '/prefix/:id',
        () => {
            if (Math.random() > 0.5) return error(400, 'hello')

            return 'a'
        },
        {
            body: t.Object({
                username: t.String()
            })
        }
    )

type app = typeof app

const treaty = edenTreaty<app>('::1')

const a = await treaty.prefix[1].post({
    username: 'a'
})

type A = {
    a: string
    b: string
}

type B = Omit<A, 'a'> extends {} ? true : false
