import { Elysia, form, sse, t } from 'elysia'
import { Treaty, treaty } from '../src'

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
    .group('/empty-test', (g) => g
        .get('/with-maybe-empty', ({ query, headers }) => ({ query, headers }), {
            query: t.MaybeEmpty(t.Object({ alias: t.String() })),
            headers: t.MaybeEmpty(t.Object({ username: t.String() }))
        })
        .get('/with-unknown', ({ query, headers }) => ({ query, headers }), {
            query: t.Unknown(),
            headers: t.Unknown(),
        })
        .get('/with-empty-record', ({ query, headers }) => ({ query, headers }), {
            query: t.Record(t.String(), t.Never()),
            headers: t.Record(t.String(), t.Never()),
        })
        .get('/with-empty-obj', ({ query, headers }) => ({ query, headers }), {
            query: t.Object({}),
            headers: t.Object({}),
        })
        .get('/with-partial', ({ query, headers }) => ({ query, headers }), {
            query: t.Partial(t.Object({ alias: t.String() })),
            headers: t.Partial(t.Object({ username: t.String() })),
        })
        .get('/with-optional', ({ query, headers }) => ({ query, headers }), {
            query: t.Optional(t.Object({ alias: t.String() })),
            headers: t.Optional(t.Object({ username: t.String() })),
        })
        .get('/with-union-undefined', ({ query, headers }) => ({ query, headers }), {
            query: t.Union([t.Object({ alias: t.String() }), t.Undefined()]),
            headers: t.Union([t.Object({ username: t.String() }), t.Undefined()])
        })
        .get('/with-union-empty-obj', ({ query, headers }) => ({ query, headers }), {
            query: t.Union([t.Object({ alias: t.String() }), t.Object({})]),
            headers: t.Union([t.Object({ username: t.String() }), t.Object({})]),
        })
        .get('/with-union-empty-record', ({ query, headers }) => ({ query, headers }), {
            query: t.Union([t.Object({ alias: t.String() }), t.Record(t.String(), t.Never())]),
            headers: t.Union([t.Object({ username: t.String() }), t.Record(t.String(), t.Never())]),
        })
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
    .post('/files', ({ body: { files } }) => files.map((file) => file.name), {
        body: t.Object({
            files: t.Files()
        })
    })
    .post('/file', ({ body: { file } }) => file.name, {
        body: t.Object({
            file: t.File()
        })
    })

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
        'with-union-empty-record',
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

describe('Treaty2 - Using t.File() and t.Files() from server', async () => {
    const filePath1 = `${import.meta.dir}/public/aris-yuzu.jpg`
    const filePath2 = `${import.meta.dir}/public/midori.png`
    const filePath3 = `${import.meta.dir}/public/kyuukurarin.mp4`

    const bunFile1 = Bun.file(filePath1)
    const bunFile2 = Bun.file(filePath2)
    const bunFile3 = Bun.file(filePath3)

    const file1 = new File([await bunFile1.arrayBuffer()], 'cumin.webp', {
        type: 'image/webp'
    })
    const file2 = new File([await bunFile2.arrayBuffer()], 'curcuma.jpg', {
        type: 'image/jpeg'
    })
    const file3 = new File([await bunFile3.arrayBuffer()], 'kyuukurarin.mp4', {
        type: 'video/mp4'
    })

    const filesForm = new FormData()
    filesForm.append('files', file1)
    filesForm.append('files', file2)
    filesForm.append('files', file3)

    const bunFilesForm = new FormData()
    bunFilesForm.append('files', bunFile1)
    bunFilesForm.append('files', bunFile2)
    bunFilesForm.append('files', bunFile3)

    it('accept a single Bun.file', async () => {
        const { data: files } = await client.files.post({
            files: bunFile1 as unknown as File[]
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([bunFile1.name!])

        const { data: filesbis } = await client.files.post({
            files: [bunFile1] as unknown as File[]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([bunFile1.name!])

        const { data: file } = await client.file.post({
            file: bunFile1 as unknown as File
        })

        expect(file).not.toBeNull()
        expect(file).not.toBeUndefined()
        expect(file).toEqual(bunFile1.name!)
    })

    it('accept a single regular file', async () => {
        const { data: files } = await client.files.post({
            files: file1 as unknown as File[]
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([file1.name!])

        const { data: filesbis } = await client.files.post({
            files: [file1] as unknown as File[]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([file1.name!])

        const { data: file } = await client.file.post({
            file: file1 as unknown as File
        })

        expect(file).not.toBeNull()
        expect(file).not.toBeUndefined()
        expect(file).toEqual(file1.name!)
    })

    it('accept an array of multiple Bun.file', async () => {
        const { data: files } = await client.files.post({
            files: [bunFile1, bunFile2, bunFile3] as unknown as File[]
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([bunFile1.name!, bunFile2.name!, bunFile3.name!])

        const { data: filesbis } = await client.files.post({
            files: bunFilesForm.getAll('files') as unknown as File[]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([
            bunFile1.name!,
            bunFile2.name!,
            bunFile3.name!
        ])
    })

    it('accept an array of multiple regular file', async () => {
        const { data: files } = await client.files.post({
            files: [file1, file2, file3] as unknown as File[]
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([file1.name!, file2.name!, file3.name!])

        const { data: filesbis } = await client.files.post({
            files: filesForm.getAll('files') as unknown as File[]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([file1.name!, file2.name!, file3.name!])
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
})
