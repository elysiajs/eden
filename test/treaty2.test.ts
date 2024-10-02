import { Elysia, t } from 'elysia'
import { treaty } from '../src'

import { describe, expect, it, beforeAll, afterAll, mock } from 'bun:test'

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
	.get('/queries', ({ query }) => query, {
		query: t.Object({
			username: t.String(),
			alias: t.Literal('Kristen')
		})
	})
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
	.group('/nested', (app) => app.guard((app) => app.get('/data', () => 'hi')))
	.get('/error', ({ error }) => error("I'm a teapot", 'Kirifuji Nagisa'), {
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
	.get('/formdata', () => ({
		image: Bun.file('./test/kyuukurarin.mp4')
	}))
	.ws('/json-serialization-deserialization', {
		open: async (ws) => {
			for (const item of websocketPayloads) {
				ws.send(item)
			}
			ws.close()
		}
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
		const { data, error } = await client.index.get()

		expect(data).toBe('a')
		expect(error).toBeNull()
	})

	it('post index', async () => {
		const { data, error } = await client.index.post()

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

	it.todo('parse object with date', async () => {
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

	it('get queries', async () => {
		const query = { username: 'A', alias: 'Kristen' } as const

		const { data } = await client.queries.get({
			query
		})

		expect(data).toEqual(query)
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
		const data = await Promise.all([client.id.get(), client.id({ id: 'salty' }).get()])
		expect(data.map(x => x.data)).toEqual(['unknown', 'salty'])
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

		const { data } = await client.index.get({
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

		const { data } = await client.index.get({
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

		const { data } = await client.index.get({
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

	it('sends the correct custom protocols', async (done) => {
		const client = treaty<typeof app>('http://localhost:8080')

		await new Promise<void>(res => {
			const socket = client['custom-protocol'].subscribe(undefined, ['customprotocol']);
			
			socket.subscribe(() => res());
		}) 

		done()
	});
})
