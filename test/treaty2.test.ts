import { Elysia, form, sse, t } from 'elysia'
import { treaty, type Treaty } from '../src'
import { EdenFetchError } from '../src/errors'
import { streamResponse } from '../src/treaty2'

import { describe, expect, it, beforeAll, afterAll, mock, test } from 'bun:test'

const randomObject = {
    a: 'a',
    b: 2,
    c: true,
    d: false,
    e: null,
    f: new Date(0)
}
const randomArray = [
    'a',
    2,
    true,
    false,
    null,
    new Date(0),
    { a: 'a', b: 2, c: true, d: false, e: null, f: new Date(0) }
]
const websocketPayloads = [
    // strings
    'str',
    // numbers
    1,
    1.2,
    // booleans
    true,
    false,
    // null values
    null,
    // A date
    new Date(0),
    // A random object
    randomObject,
    // A random array
    randomArray
] as const

const app = new Elysia()
    .get('/', 'a')
    .post('/', 'a')
    .get('/number', () => 1)
    .get('/true', () => true)
    .get('/false', () => false)
    .post('/array', ({ body }) => body, {
        body: t.Array(t.String())
    })
    .post('/mirror', ({ body }) => body)
    .post('/body', ({ body }) => body, {
        body: t.String()
    })
    .delete('/empty', ({ body }) => ({ body: body ?? null }))
    .post('/deep/nested/mirror', ({ body }) => body, {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })
    .get('/query', ({ query }) => query, {
        query: t.Object({
            username: t.String()
        })
    })
    .get('/query-optional', ({ query }) => query, {
        query: t.Object({
            username: t.Optional(t.String())
        })
    })
    .get('/query-nullable', ({ query }) => query, {
        query: t.Object({
            username: t.Nullable(t.String())
        })
    })
    .get('/queries', ({ query }) => query, {
        query: t.Object({
            username: t.String(),
            alias: t.Literal('Kristen')
        })
    })
    .get('/queries-optional', ({ query }) => query, {
        query: t.Object({
            username: t.Optional(t.String()),
            alias: t.Literal('Kristen')
        })
    })
    .get('/queries-nullable', ({ query }) => query, {
        query: t.Object({
            username: t.Nullable(t.Number()),
            alias: t.Literal('Kristen')
        })
    })
    .group('/empty-test', (g) =>
        g
            .get(
                '/with-maybe-empty',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.MaybeEmpty(t.Object({ alias: t.String() })),
                    headers: t.MaybeEmpty(t.Object({ username: t.String() }))
                }
            )
            .get(
                '/with-unknown',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Unknown(),
                    headers: t.Unknown()
                }
            )
            .get(
                '/with-empty-record',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Record(t.String(), t.Never()),
                    headers: t.Record(t.String(), t.Never())
                }
            )
            .get(
                '/with-empty-obj',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Object({}),
                    headers: t.Object({})
                }
            )
            .get(
                '/with-partial',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Partial(t.Object({ alias: t.String() })),
                    headers: t.Partial(t.Object({ username: t.String() }))
                }
            )
            .get(
                '/with-optional',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Optional(t.Object({ alias: t.String() })),
                    headers: t.Optional(t.Object({ username: t.String() }))
                }
            )
            .get(
                '/with-union-undefined',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Union([
                        t.Object({ alias: t.String() }),
                        t.Undefined()
                    ]),
                    headers: t.Union([
                        t.Object({ username: t.String() }),
                        t.Undefined()
                    ])
                }
            )
            .get(
                '/with-union-empty-obj',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Union([
                        t.Object({ alias: t.String() }),
                        t.Object({})
                    ]),
                    headers: t.Union([
                        t.Object({ username: t.String() }),
                        t.Object({})
                    ])
                }
            )
            .get(
                '/with-union-empty-record',
                ({ query, headers }) => ({ query, headers }),
                {
                    query: t.Union([
                        t.Object({ alias: t.String() }),
                        t.Record(t.String(), t.Never())
                    ]),
                    headers: t.Union([
                        t.Object({ username: t.String() }),
                        t.Record(t.String(), t.Never())
                    ])
                }
            )
    )
    .post('/queries', ({ query }) => query, {
        query: t.Object({
            username: t.String(),
            alias: t.Literal('Kristen')
        })
    })
    .head('/queries', ({ query }) => query, {
        query: t.Object({
            username: t.String(),
            alias: t.Literal('Kristen')
        })
    })
    .group('/nested', (app) =>
        app.guard({}, (app) => app.get('/data', () => 'hi'))
    )
    .get('/error', ({ status }) => status("I'm a teapot", 'Kirifuji Nagisa'), {
        response: {
            200: t.Void(),
            418: t.Literal('Kirifuji Nagisa'),
            420: t.Literal('Snoop Dogg')
        }
    })
    .get(
        '/headers',
        ({ headers: { username, alias } }) => ({ username, alias }),
        {
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            })
        }
    )
    .post(
        '/headers',
        ({ headers: { username, alias } }) => ({ username, alias }),
        {
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            })
        }
    )
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
    .post('/date', ({ body: { date } }) => date, {
        body: t.Object({
            date: t.Date()
        })
    })
    .get('/dateObject', () => ({ date: new Date() }))
    .get('/redirect', ({ redirect }) => redirect('http://localhost:8083/true'))
    .post(
        '/redirect',
        ({ redirect }) => redirect('http://localhost:8083/true'),
        {
            body: t.Object({
                username: t.String()
            })
        }
    )
    .get('/formdata', () =>
        form({
            image: Bun.file('./test/public/kyuukurarin.mp4')
        })
    )
    .ws('/json-serialization-deserialization', {
        open: async (ws) => {
            for (const item of websocketPayloads) {
                ws.send(item)
            }
            ws.close()
        }
    })
    .get('/stream', function* stream() {
        yield 'a'
        yield 'b'
        yield 'c'
    })
    .get('/stream-async', async function* stream() {
        yield 'a'
        yield 'b'
        yield 'c'
    })
    .get('/stream-return', function* stream() {
        return 'a'
    })
    .get('/stream-return-async', function* stream() {
        return 'a'
    })
    .get('/id/:id?', ({ params: { id = 'unknown' } }) => id)

const client = treaty(app)

describe('Treaty2', () => {
    it('get index', async () => {
        const { data, error } = await client.get()

        expect(data).toBe('a')
        expect(error).toBeNull()
    })

    it('post index', async () => {
        const { data, error } = await client.post()

        expect(data).toBe('a')
        expect(error).toBeNull()
    })

    it('parse number', async () => {
        const { data } = await client.number.get()

        expect(data).toEqual(1)
    })

    it('parse true', async () => {
        const { data } = await client.true.get()

        expect(data).toEqual(true)
    })

    it('parse false', async () => {
        const { data } = await client.false.get()

        expect(data).toEqual(false)
    })

    it('parse object with date', async () => {
        const { data } = await client.dateObject.get()

        expect(data?.date).toBeInstanceOf(Date)
    })

    it('post array', async () => {
        const { data } = await client.array.post(['a', 'b'])

        expect(data).toEqual(['a', 'b'])
    })

    it('post body', async () => {
        const { data } = await client.body.post('a')

        expect(data).toEqual('a')
    })

    it('post mirror', async () => {
        const body = { username: 'A', password: 'B' }

        const { data } = await client.mirror.post(body)

        expect(data).toEqual(body)
    })

    it('delete empty', async () => {
        const { data } = await client.empty.delete()

        expect(data).toEqual({ body: null })
    })

    it('post deep nested mirror', async () => {
        const body = { username: 'A', password: 'B' }

        const { data } = await client.deep.nested.mirror.post(body)

        expect(data).toEqual(body)
    })

    it('get query', async () => {
        const query = { username: 'A' }

        const { data } = await client.query.get({
            query
        })

        expect(data).toEqual(query)
    })

    // t.Nullable is impossible to represent with query params
    // without elysia specifically parsing 'null'
    it('get null query', async () => {
        const query = { username: null }

        const { data, error } = await client['query-nullable'].get({
            query
        })

        expect(data).toBeNull()
        expect(error?.status).toBe(422)
        expect(error?.value.type).toBe('validation')
    })

    it('get optional query', async () => {
        const query = { username: undefined }

        const { data } = await client['query-optional'].get({
            query
        })

        expect(data).toEqual({
            username: undefined
        })
    })

    it('get queries', async () => {
        const query = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.queries.get({
            query
        })

        expect(data).toEqual(query)
    })

    it('get optional queries', async () => {
        const query = { username: undefined, alias: 'Kristen' } as const

        const { data } = await client['queries-optional'].get({
            query
        })

        expect(data).toEqual({
            username: undefined,
            alias: 'Kristen'
        })
    })

    // t.Nullable is impossible to represent with query params
    // without elysia specifically parsing 'null'
    it('get nullable queries', async () => {
        const query = { username: null, alias: 'Kristen' } as const

        const { data, error } = await client['queries-nullable'].get({
            query
        })

        expect(data).toBeNull()
        expect(error?.status).toBe(422)
        expect(error?.value.type).toBe('validation')
    })

    test.each([
        'with-empty-obj',
        'with-partial',
        'with-unknown',
        'with-empty-record',
        'with-union-empty-obj',
        'with-union-empty-record'
        // 'with-maybe-empty',
        // 'with-optional',
        // 'with-union-undefined',
    ] as const)('type test for case: %s', async (caseName) => {
        const { data, error } = await client['empty-test'][caseName].get()
        expect(error, JSON.stringify(error, null, 2)).toBeNull()
        expect(data).toEqual({ query: {}, headers: {} })
    })

    it('post queries', async () => {
        const query = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.queries.post(null, {
            query
        })

        expect(data).toEqual(query)
    })

    it('head queries', async () => {
        const query = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.queries.post(null, {
            query
        })

        expect(data).toEqual(query)
    })

    it('get nested data', async () => {
        const { data } = await client.nested.data.get()

        expect(data).toEqual('hi')
    })

    it('handle error', async () => {
        const { data, error } = await client.error.get()

        let value

        if (error)
            switch (error.status) {
                case 418:
                    value = error.value
                    break

                case 420:
                    value = error.value
                    break
            }

        expect(data).toBeNull()
        expect(value).toEqual('Kirifuji Nagisa')
    })

    it('get headers', async () => {
        const headers = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.headers.get({
            headers
        })

        expect(data).toEqual(headers)
    })

    it('post headers', async () => {
        const headers = { username: 'A', alias: 'Kristen' } as const

        const { data } = await client.headers.post(null, {
            headers
        })

        expect(data).toEqual(headers)
    })

    it('handle interception', async () => {
        const client = treaty(app, {
            onRequest(path) {
                if (path === '/headers-custom')
                    return {
                        headers: {
                            'x-custom': 'custom'
                        }
                    }
            },
            async onResponse(response) {
                return { intercepted: true, data: await response.json() }
            }
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('handle interception array', async () => {
        const client = treaty(app, {
            onRequest: [
                () => ({
                    headers: {
                        'x-custom': 'a'
                    }
                }),
                () => ({
                    headers: {
                        'x-custom': 'custom'
                    }
                })
            ],
            onResponse: [
                () => {},
                async (response) => {
                    return { intercepted: true, data: await response.json() }
                }
            ]
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('accept headers configuration', async () => {
        const client = treaty(app, {
            headers(path) {
                if (path === '/headers-custom')
                    return {
                        'x-custom': 'custom'
                    }
            },
            async onResponse(response) {
                return { intercepted: true, data: await response.json() }
            }
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('accept async headers configuration', async () => {
        const client = treaty(app, {
            async headers(path) {
                // Simulate async operation (e.g., fetching token)
                await new Promise((r) => setTimeout(r, 10))
                if (path === '/headers-custom')
                    return {
                        'x-custom': 'custom'
                    }
            },
            async onResponse(response) {
                return { intercepted: true, data: await response.json() }
            }
        })

        const headers = { username: 'a', alias: 'Kristen' } as const

        const { data } = await client['headers-custom'].get({
            headers
        })

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('accept headers configuration array', async () => {
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

        expect(data).toEqual({
            // @ts-expect-error
            intercepted: true,
            data: {
                ...headers,
                'x-custom': 'custom'
            }
        })
    })

    it('send date', async () => {
        const { data } = await client.date.post({ date: new Date() })

        expect(data).toBeInstanceOf(Date)
    })

    it('redirect should set location header', async () => {
        const { headers, status } = await client['redirect'].get({
            fetch: {
                redirect: 'manual'
            }
        })
        expect(status).toEqual(302)
        expect(new Headers(headers).get('location')).toEqual(
            'http://localhost:8083/true'
        )
    })

    it('generator return stream', async () => {
        const a = await client.stream.get()
        const result = <string[]>[]

        for await (const chunk of a.data!) result.push(chunk)

        expect(result).toEqual(['a', 'b', 'c'])
    })

    it('generator return async stream', async () => {
        const a = await client['stream-async'].get()
        const result = <string[]>[]

        for await (const chunk of a.data!) result.push(chunk)

        expect(result).toEqual(['a', 'b', 'c'])
    })

    it('generator return value', async () => {
        const a = await client['stream-return'].get()

        expect(a.data).toBe('a')
    })

    it('generator return async value', async () => {
        const a = await client['stream-return-async'].get()

        expect(a.data).toBe('a')
    })

    it('handle optional params', async () => {
        const data = await Promise.all([
            client.id.get(),
            client.id({ id: 'salty' }).get()
        ])
        expect(data.map((x) => x.data)).toEqual(['unknown', 'salty'])
    })
})

describe('Treaty2 - Server offline', () => {
    it('should return network error in error field when server is offline', async () => {
        // Use a port where no server is running
        const offlineClient = treaty<typeof app>('http://localhost:59999')

        const { data, error, status } = await offlineClient.get()

        expect(data).toBeNull()
        expect(error).toBeInstanceOf(EdenFetchError)
        expect(error?.status).toBe(503)
        expect(status).toBe(503)
        expect(error?.value).toBeInstanceOf(Error)
    })

    it('should return network error for POST requests when server is offline', async () => {
        const offlineClient = treaty<typeof app>('http://localhost:59999')

        const { data, error, status } = await offlineClient.mirror.post({
            username: 'test',
            password: 'test'
        })

        expect(data).toBeNull()
        expect(error).toBeInstanceOf(EdenFetchError)
        expect(error?.status).toBe(503)
        expect(status).toBe(503)
        expect(error?.value).toBeInstanceOf(Error)
    })
})

describe('Treaty2 - throwHttpErrors', () => {
    // Config-level tests
    it('throws HTTP errors when config throwHttpErrors is true', async () => {
        const client = treaty(app, { throwHttpErrors: true })
        expect(client.error.get()).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('throws network errors when config throwHttpErrors is true', async () => {
        const client = treaty<typeof app>('http://localhost:59999', {
            throwHttpErrors: true
        })
        expect(client.get()).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('returns error in result when config throwHttpErrors is false', async () => {
        const client = treaty(app, { throwHttpErrors: false })
        const { error } = await client.error.get()
        expect(error?.status).toBe(418)
    })

    it('throws selectively when config throwHttpErrors is a function', async () => {
        const client = treaty(app, { throwHttpErrors: (e) => e.status === 418 })
        await expect(client.error.get()).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('does not throw when config function returns false', async () => {
        const client = treaty(app, { throwHttpErrors: (e) => e.status === 500 })
        const { error } = await client.error.get()
        expect(error?.status).toBe(418)
    })

    // Per-request override tests
    it('per-request true overrides config false', async () => {
        const client = treaty(app, { throwHttpErrors: false })
        expect(
            client.error.get({ throwHttpErrors: true })
        ).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('per-request false overrides config true', async () => {
        const client = treaty(app, { throwHttpErrors: true })
        const { error } = await client.error.get({ throwHttpErrors: false })
        expect(error?.status).toBe(418)
    })

    it('per-request function overrides config boolean', async () => {
        const client = treaty(app, { throwHttpErrors: true })
        const { error } = await client.error.get({
            throwHttpErrors: (e) => e.status === 500
        })
        expect(error?.status).toBe(418)
    })

    it('per-request override works for POST requests', async () => {
        const client = treaty<typeof app>('http://localhost:59999', {
            throwHttpErrors: false
        })
        expect(
            client.mirror.post(
                { username: 'test', password: 'test' },
                {
                    throwHttpErrors: true
                }
            )
        ).rejects.toBeInstanceOf(EdenFetchError)
    })
})

describe('Treaty2 - Using endpoint URL', () => {
    const treatyApp = treaty<typeof app>('http://localhost:8083')

    beforeAll(async () => {
        await new Promise((resolve) => {
            app.listen(8083, () => {
                resolve(null)
            })
        })
    })

    afterAll(() => {
        app.stop()
    })

    it('redirect should set location header', async () => {
        const { headers, status } = await treatyApp.redirect.get({
            fetch: {
                redirect: 'manual'
            }
        })
        expect(status).toEqual(302)
        expect(new Headers(headers).get('location')).toEqual(
            'http://localhost:8083/true'
        )
    })

    it('redirect should set location header with post', async () => {
        const { headers, status } = await treatyApp.redirect.post(
            {
                username: 'a'
            },
            {
                fetch: {
                    redirect: 'manual'
                }
            }
        )
        expect(status).toEqual(302)
        expect(new Headers(headers).get('location')).toEqual(
            'http://localhost:8083/true'
        )
    })

    it('get formdata', async () => {
        const { data } = await treatyApp.formdata.get()

        expect(data!.image.size).toBeGreaterThan(0)
    })

    it("doesn't encode if it doesn't need to", async () => {
        const mockedFetch: any = mock((url: string) => {
            return new Response(url)
        })

        const client = treaty<typeof app>('localhost', { fetcher: mockedFetch })

        const { data } = await client.get({
            query: {
                hello: 'world'
            }
        })

        expect(data).toEqual('http://localhost/?hello=world' as any)
    })

    it('encodes query parameters if it needs to', async () => {
        const mockedFetch: any = mock((url: string) => {
            return new Response(url)
        })

        const client = treaty<typeof app>('localhost', { fetcher: mockedFetch })

        const { data } = await client.get({
            query: {
                ['1/2']: '1/2'
            }
        })

        expect(data).toEqual('http://localhost/?1%2F2=1%2F2' as any)
    })

    it('accepts and serializes several values for the same query parameter', async () => {
        const mockedFetch: any = mock((url: string) => {
            return new Response(url)
        })

        const client = treaty<typeof app>('localhost', { fetcher: mockedFetch })

        const { data } = await client.get({
            query: {
                ['1/2']: ['1/2', '1 2']
            }
        })

        expect(data).toEqual('http://localhost/?1%2F2=1%2F2&1%2F2=1%202' as any)
    })

    it('Receives the proper objects back from the other end of the websocket', async (done) => {
        app.listen(8080, async () => {
            const client = treaty<typeof app>('http://localhost:8080')

            const dataOutOfSocket = await new Promise<any[]>((res) => {
                const data: any = []
                // Wait until we've gotten all the data
                const socket =
                    client['json-serialization-deserialization'].subscribe()
                socket.subscribe(({ data: dataItem }) => {
                    data.push(dataItem)
                    // Only continue when we got all the messages
                    if (data.length === websocketPayloads.length) {
                        res(data)
                    }
                })
            })

            // expect that everything that came out of the socket
            // got deserialized into the same thing that we inteded to send
            for (let i = 0; i < websocketPayloads.length; i++) {
                expect(dataOutOfSocket[i]).toEqual(websocketPayloads[i])
            }

            done()
        })
    })

    it('handle Server-Sent Event', async () => {
        const app = new Elysia().get('/test', function* () {
            yield sse({
                event: 'start'
            })
            yield sse({
                event: 'message',
                data: 'Hi, this is Yae Miko from Grand Narukami Shrine'
            })
            yield sse({
                event: 'message',
                data: 'Would you interested in some novels about Raiden Shogun?'
            })
            yield sse({
                event: 'end'
            })
        })

        const client = treaty(app)

        const response = await client.test.get()

        const events = <any[]>[]

        type A = typeof client.test.get

        for await (const a of response.data!) events.push(a)

        expect(events).toEqual([
            { event: 'start' },
            {
                event: 'message',
                data: 'Hi, this is Yae Miko from Grand Narukami Shrine'
            },
            {
                event: 'message',
                data: 'Would you interested in some novels about Raiden Shogun?'
            },
            { event: 'end' }
        ])
    })

    it('handle multiple sse in same tick', async () => {
        const app = new Elysia()
            .get('/chunk', async function* () {
                const chunks = ['chunk1', 'chunk2']

                for (const chunk of chunks) {
                    yield sse({
                        event: 'data',
                        data: { text: chunk, attempt: 1 }
                    })

                    yield 1

                    yield sse({
                        event: 'data',
                        data: { text: chunk, attempt: 2 }
                    })
                }

                yield sse({
                    event: 'complete',
                    data: { message: 'done' }
                })
            })
            .listen(3000)

        const client = treaty(app)

        const response = await client.chunk.get()

        const events = <any[]>[]

        type A = typeof client.chunk.get

        for await (const a of response.data!) events.push(a)

        expect(events).toEqual([
            {
                event: 'data',
                data: {
                    text: 'chunk1',
                    attempt: 1
                }
            },
            {
                data: 1
            },
            {
                event: 'data',
                data: {
                    text: 'chunk1',
                    attempt: 2
                }
            },
            {
                event: 'data',
                data: {
                    text: 'chunk2',
                    attempt: 1
                }
            },
            {
                data: 1
            },
            {
                event: 'data',
                data: {
                    text: 'chunk2',
                    attempt: 2
                }
            },
            {
                event: 'complete',
                data: {
                    message: 'done'
                }
            }
        ])
    })

    it('use custom content-type', async () => {
        const app = new Elysia().post(
            '/',
            ({ headers }) => headers['content-type']
        )

        const client = treaty(app)

        const { data } = await client.post(
            {},
            {
                headers: {
                    'content-type': 'application/json!'
                }
            }
        )

        expect(data).toBe('application/json!' as any)
    })
})

function createChunkedSSEResponse(chunks: Array<string>): Response {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk))
            }
            controller.close()
        }
    })

    return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' }
    })
}

describe('Treaty2 - SSE Chunk Splitting (fast streaming edge cases)', () => {
    it('handles SSE event split across chunks (data: broken mid-line)', async () => {
        const chunks = ['event: message\nda', 'ta: hello world\n\n']
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([{ event: 'message', data: 'hello world' }])
    })

    it('handles SSE event split at newline boundary', async () => {
        const chunks = [
            'event: start\ndata: hel',
            'lo\n\nevent: end\ndata: world\n\n'
        ]
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([
            { event: 'start', data: 'hello' },
            { event: 'end', data: 'world' }
        ])
    })

    it('handles multiple complete events in single chunk', async () => {
        const chunks = [
            'event: a\ndata: 1\n\nevent: b\ndata: 2\n\nevent: c\ndata: 3\n\n'
        ]
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([
            { event: 'a', data: 1 },
            { event: 'b', data: 2 },
            { event: 'c', data: 3 }
        ])
    })

    it('handles event split across three chunks', async () => {
        const chunks = ['event: ', 'message\ndata: {"te', 'xt":"hello"}\n\n']
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([{ event: 'message', data: { text: 'hello' } }])
    })

    it('handles UTF-8 multibyte character split across chunks', async () => {
        const fireEmoji = '🔥'
        const fullData = `event: emoji\ndata: ${fireEmoji}\n\n`
        const encoder = new TextEncoder()
        const encoded = encoder.encode(fullData)

        const emojiStart = fullData.indexOf(fireEmoji)
        const bytePos = encoder.encode(fullData.slice(0, emojiStart)).length + 2

        const chunk1 = encoded.slice(0, bytePos)
        const chunk2 = encoded.slice(bytePos)

        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                controller.enqueue(chunk1)
                controller.enqueue(chunk2)
                controller.close()
            }
        })

        const response = new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream' }
        })

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([{ event: 'emoji', data: fireEmoji }])
    })

    it('handles rapid streaming with many small chunks', async () => {
        const fullSSE = 'event: fast\ndata: ok\n\n'
        const chunks = fullSSE.split('')
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([{ event: 'fast', data: 'ok' }])
    })

    it('handles incomplete event at end of stream (no trailing newlines)', async () => {
        const chunks = ['event: final\ndata: incomplete']
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([{ event: 'final', data: 'incomplete' }])
    })

    it('handles SSE with id field split across chunks', async () => {
        const chunks = ['id: 123\nevent: ', 'update\ndata: test\n\n']
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([{ id: 123, event: 'update', data: 'test' }])
    })

    it('handles mixed complete and split events', async () => {
        const chunks = [
            'event: first\ndata: 1\n\nevent: sec',
            'ond\ndata: 2\n\nevent: third\ndata: 3\n\n'
        ]
        const response = createChunkedSSEResponse(chunks)

        const events: Array<unknown> = []
        for await (const event of streamResponse(response)) {
            events.push(event)
        }

        expect(events).toEqual([
            { event: 'first', data: 1 },
            { event: 'second', data: 2 },
            { event: 'third', data: 3 }
        ])
    })

    it('handle root dynamic parameter', async () => {
        const app = new Elysia().get('/:id', ({ params: { id } }) => id, {
            params: t.Object({
                id: t.Number()
            })
        })

        const api = treaty(app)
        const { data } = await api({ id: '1' }).get()

        expect(data).toBe(1)
    })

    it('handle path with "index" in name', async () => {
        const app = new Elysia().get('/search/index/:indexId/stocks', () => ({
            data: []
        }))

        const api = treaty(app)
        type api = typeof api

		const { status } = await api.search.index({ indexId: 'a' }).stocks.get()

		expect(status).toEqual(200)
	})
})
