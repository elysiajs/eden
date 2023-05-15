import { Elysia, t } from 'elysia'
import { edenFetch } from '../src'
import type { Server } from './server'

const json = {
    name: 'Saori',
    affiliation: 'Arius',
    type: 'Striker'
}

const app = new Elysia()
    .get('/', () => 'hi')
    .post('/', () => 'post')
    .get('/json', ({ body }) => json)
    .get(
        '/json-utf8',
        ({ set }) =>
            new Response(JSON.stringify(json), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            })
    )
    .get('/name/:name', ({ params: { name } }) => name)
    .post(
        '/headers',
        ({ request: { headers } }) => headers.get('x-affiliation'),
        {
            headers: t.Object({
                'x-affiliation': t.Literal('Arius')
            })
        }
    )
    .get('/number', () => 1)
    .get('/true', () => true)
    .get('/false', () => false)
    .get('/throw-error', () => {
        throw new Error('hare')

        return 'Hi'
    })
    .get(
        '/direct-error',
        ({ set }) => {
            set.status = 500

            return 'hare'
        },
        {
            response: {
                200: t.String(),
                500: t.Literal('hare')
            }
        }
    )
    .listen(8080)

const fetch = edenFetch<typeof app>('http://localhost:8080')

await fetch('/direct-error', {})

const { data } = await fetch('/name/:name', {
    params: {
        name: 'elysia'
    }
})

console.log(data)
