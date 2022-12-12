import { Elysia, t } from 'elysia'
import { eden } from '../src'

import { beforeAll, describe, expect, it } from 'bun:test'

const app = new Elysia()
    .get('/', () => 'hi')
    .post('/', () => 'hi')
    .post('/mirror', ({ body }) => body, {
        schema: {
            body: t.Object({
                username: t.String(),
                password: t.String()
            })
        }
    })
    .post('/deep/nested/mirror', ({ body }) => body, {
        schema: {
            body: t.Object({
                username: t.String(),
                password: t.String()
            })
        }
    })
    .get('/query', ({ query }) => query)
    .listen(8080)

const client = eden<typeof app>('http://localhost:8080')

describe('Eden', () => {
    it('get index', async () => {
        expect(await client.index.GET()).toBe('hi')
    })

    it('post index', async () => {
        expect(await client.index.GET()).toBe('hi')
    })

    it('post mirror', async () => {
        const body = { username: 'A', password: 'B' }

        expect(await client.mirror.POST(body)).toEqual(body)
    })

    it('get query', async () => {
        const body = { username: 'A', password: 'B' }

        expect(
            await client.query.GET({
                $query: body
            })
        ).toEqual(body)
    })
})
