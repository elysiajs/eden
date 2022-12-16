import { Elysia, t } from 'elysia'
import { eden } from '../src'

import { beforeAll, describe, expect, it } from 'bun:test'

const prefix =
    <Prefix extends string = string>(prefix: Prefix) =>
    (app: Elysia) =>
        app.get(`${prefix}/prefixed`, () => 'hi')

const app = new Elysia()
    .get('/', () => 'hi')
    .use(prefix('/prefix'))
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
    .get('/sign-in', ({ query }) => query)
    .group('/v2', (app) => app.guard({}, (app) => app.get('/data', () => 'hi')))
    .get('/number', () => 1)
    .get('/true', () => true)
    .get('/false', () => false)
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

    it('parse camel-case', async () => {
        const body = { username: 'A', password: 'B' }

        expect(
            await client.signIn.GET({
                $query: body
            })
        ).toEqual(body)
    })

    it('handle camel-case', async () => {
        const body = { username: 'A', password: 'B' }

        expect(
            await client['sign-in'].GET({
                $query: body
            })
        ).toEqual(body)
    })

    it('parse number', async () => {
        expect(await client.number.GET()).toEqual(1)
    })

    it('parse true', async () => {
        expect(await client.true.GET()).toEqual(true)
    })

    it('parse false', async () => {
        expect(await client.false.GET()).toEqual(false)
    })

    // ? Test for type inference
    it('handle group and guard', async () => {
        expect(await client.v2.data.GET()).toEqual('hi')
    })

    // ? Test for type inference
    it('strictly type plugin prefix', async () => {
        expect(await client.prefix.prefixed.GET()).toBe('hi')
    })
})
