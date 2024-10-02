import { Elysia, t } from 'elysia'
import { edenTreaty } from '../src'

import { beforeEach, describe, expect, it, spyOn, mock } from 'bun:test'

const fetchSpy = spyOn(global, 'fetch')

const utf8Json = { hello: 'world' }

const prefix =
    <Prefix extends string>(prefix: Prefix) =>
    (app: Elysia) =>
        app.get(`${prefix}/prefixed`, () => 'hi')

const app = new Elysia()
    .get('/', () => 'hi')
    .use(prefix('/prefix'))
    .post('/', () => 'hi')
    .delete('/empty', ({ body }) => ({ body: body ?? null }))
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
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })
    .post('/deep/nested/mirror', ({ body }) => body, {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })
    .get('/query', ({ query }) => query)
    .get('/sign-in', ({ query }) => query)
    .group('/v2', (app) => app.guard({}, (app) => app.get('/data', () => 'hi')))
    .get('/number', () => 1)
    .get('/true', () => true)
    .get('/false', () => false)
    .patch('/update', () => 1)
    .post('/array', ({ body }) => body, {
        body: t.Array(t.String())
    })
    .post('/string', ({ body }) => body, {
        body: t.String()
    })
	.ws('/custom-protocol', {
        headers: t.Object({
			'sec-websocket-protocol': t.Literal('customprotocol'),
		}),
        open: async (ws) => { 
			ws.send('success');
			ws.close();
		},
	})
    .listen(8082)

const client = edenTreaty<typeof app>('http://localhost:8082')

beforeEach(() => {
    fetchSpy.mockClear()
})

describe('Eden Treaty', () => {
    it('get index', async () => {
        const { data } = await client.index.get()

        expect(data).toBe('hi')
    })

    it('post index', async () => {
        const { data } = await client.index.get()

        expect(data).toBe('hi')
    })

    it('post mirror', async () => {
        const body = { username: 'A', password: 'B' }

        const { data } = await client.mirror.post(body)

        expect(data).toEqual(body)
    })

    it('get query', async () => {
        const $query = { username: 'A', password: 'B' }

        const { data } = await client.query.get({
            $query
        })

        expect(data).toEqual($query)
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

    it('parse json with extra parameters', async () => {
        const { data } = await client['json-utf8'].get()
        // @ts-ignore
        expect(data).toEqual(utf8Json)
    })

    it('send array', async () => {
        const { data } = await client.array.post(['a', 'b', 'c'])

        expect(data).toEqual(['a', 'b', 'c'])
    })

    it('send string', async () => {
        const { data } = await client.string.post('hello')

        expect(data).toEqual('hello')
    })

    it('Handle single inline transform', async () => {
        let thrown = false

        try {
            const { data } = await client.mirror.post({
                username: 'saltyaom',
                password: '12345678',
                $transform: ({ data }) => {
                    if (data?.password === '12345678') throw new Error('a')
                }
            })
        } catch {
            thrown = true
        }

        expect(thrown).toBe(true)
    })

    it('Handle multiple inline transform', async () => {
        let thrown = false

        try {
            const { data } = await client.mirror.post({
                username: 'saltyaom',
                password: '12345678',
                $transform: [
                    () => {},
                    ({ data }) => {
                        if (data?.password === '12345678') throw new Error('a')
                    }
                ]
            })
        } catch {
            thrown = true
        }

        expect(thrown).toBe(true)
    })

    it('Handle global transform', async () => {
        let thrown = false

        const client = edenTreaty<typeof app>('http://localhost:8082', {
            transform: ({ data }) => {
                if (data?.password === '12345678') throw new Error('a')
            }
        })

        try {
            const { data } = await client.mirror.post({
                username: 'saltyaom',
                password: '12345678'
            })
        } catch {
            thrown = true
        }

        expect(thrown).toBe(true)
    })

    it('Handle multiple global transform', async () => {
        let thrown = false

        const client = edenTreaty<typeof app>('http://localhost:8082', {
            transform: [
                () => {},
                ({ data }) => {
                    if (data?.password === '12345678') throw new Error('a')
                }
            ]
        })

        try {
            const { data } = await client.mirror.post({
                username: 'saltyaom',
                password: '12345678'
            })
        } catch {
            thrown = true
        }

        expect(thrown).toBe(true)
    })

    it('Merge inline and global transforms', async () => {
        let thrown = false

        const client = edenTreaty<typeof app>('http://localhost:8082', {
            transform: [
                () => {},
                ({ data }) => {
                    if (data?.password === '1234567') throw new Error('a')
                }
            ]
        })

        try {
            const { data } = await client.mirror.post({
                username: 'saltyaom',
                password: '12345678',
                $transform: [
                    () => {},
                    ({ data }) => {
                        if (data?.password === '12345678') throw new Error('a')
                    }
                ]
            })
        } catch {
            thrown = true
        }

        expect(thrown).toBe(true)
    })

    // ? Test for type inference
    it('handle group and guard', async () => {
        const { data } = await client.v2.data.get()

        expect(data).toEqual('hi')
    })

    // ? Test for type inference
    it('strictly type plugin prefix', async () => {
        const { data } = await client.prefix.prefixed.get()

        expect(data).toBe('hi')
    })

    // ? Test for request method
    it('should always send uppercase as final request method', async () => {
        const { data } = await client.update.patch()

        expect(data).toBe(1)
        expect(
            (fetchSpy.mock.calls[0]! as unknown as [unknown, RequestInit])[1]
                .method
        ).toBe('PATCH')
    })

    it('send empty body', async () => {
        const { data } = await client.empty.delete()

        expect(data).toEqual({ body: null })
    })


	it('sends the correct custom protocols', async (done) => {
		await new Promise<void>(res => {
			const socket = client['custom-protocol'].subscribe(undefined, ['customprotocol']);
			
			socket.subscribe(() => res());
		}) 

		done()
	});
})
