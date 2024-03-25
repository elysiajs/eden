import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
    .get(
        '/headers-custom',
        ({ headers, headers: { username, alias } }) => ({
            username,
            alias,
            'x-custom': headers['x-custom']
        }),
        {
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen'),
                'x-custom': t.Optional(t.Literal('custom'))
            })
        }
    )

const client = treaty(app, {
    headers: [
        (path) => {
            if (path === '/headers-custom')
                return {
                    'x-custom': 'custom'
                }
        }
    ],
    async onResponse(response) {
        return { intercepted: true, data: await response.json() }
    }
})

const headers = { username: 'a', alias: 'Kristen' } as const

const { data } = await client['headers-custom'].get({
    headers
})

console.log(data)

// expect(data).toEqual({
//     // @ts-expect-error
//     intercepted: true,
//     data: {
//         ...headers,
//         'x-custom': 'custom'
//     }
// })