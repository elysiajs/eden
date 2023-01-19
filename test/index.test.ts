import { Elysia, t } from 'elysia'
import { eden } from '../src'

import { beforeAll, describe, expect, it } from 'bun:test'

const utf8Json = { hello: 'world' }

const prefix =
    <Prefix extends string = string>(prefix: Prefix) =>
    (app: Elysia) =>
        app.get(`${prefix}/prefixed`, () => 'hi')

const app = new Elysia()
    .get('/', () => 'hi')
    .use(prefix('/prefix'))
    .post('/', () => 'hi')
    .get(
        '/json-utf8',
        () =>
            new Response(JSON.stringify(utf8Json), {
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                }
            })
    )
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
        expect(await client.index.get()).toBe('hi')
    })

    it('post index', async () => {
        expect(await client.index.get()).toBe('hi')
    })

    it('post mirror', async () => {
        const body = { username: 'A', password: 'B' }

        expect(await client.mirror.post(body)).toEqual(body)
    })

    it('get query', async () => {
        const body = { username: 'A', password: 'B' }

        expect(
            await client.query.get({
                $query: body
            })
        ).toEqual(body)
    })

    it('parse camel-case', async () => {
        const body = { username: 'A', password: 'B' }

        expect(
            await client.signIn.get({
                $query: body
            })
        ).toEqual(body)
    })

    it('handle camel-case', async () => {
        const body = { username: 'A', password: 'B' }

        expect(
            await client['sign-in'].get({
                $query: body
            })
        ).toEqual(body)
    })

    it('parse number', async () => {
        expect(await client.number.get()).toEqual(1)
    })

    it('parse true', async () => {
        expect(await client.true.get()).toEqual(true)
    })

    it('parse false', async () => {
        expect(await client.false.get()).toEqual(false)
    })

    it('parse json with extra parameters', async () => {
        expect(await client.jsonUtf8.get()).toEqual(utf8Json)
    })

    // ? Test for type inference
    it('handle group and guard', async () => {
        expect(await client.v2.data.get()).toEqual('hi')
    })

    // ? Test for type inference
    it('strictly type plugin prefix', async () => {
        expect(await client.prefix.prefixed.get()).toBe('hi')
    })
})
