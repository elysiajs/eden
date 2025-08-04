import { Elysia, file, form, t } from 'elysia'
import { treaty } from '../../src'
import { expectTypeOf } from 'expect-type'

const plugin = new Elysia({ prefix: '/level' })
    .get('/', '2')
    .get('/level', '2')
    .get('/:id', ({ params: { id } }) => id)
    .get('/:id/ok', ({ params: { id } }) => id)

const app = new Elysia()
    .get('/', 'a')
    .post('/', 'a')
    .get('/number', () => 1 as const)
    .get('/true', () => true)
    .post('/array', ({ body }) => body, {
        body: t.Array(t.String())
    })
    .post('/mirror', ({ body }) => body)
    .post('/body', ({ body }) => body, {
        body: t.String()
    })
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
        '/queries-headers',
        ({ headers: { username, alias } }) => ({ username, alias }),
        {
            query: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            }),
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            })
        }
    )
    .post(
        '/queries-headers',
        ({ headers: { username, alias } }) => ({ username, alias }),
        {
            query: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            }),
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            })
        }
    )
    .post(
        '/body-queries-headers',
        ({ headers: { username, alias } }) => ({ username, alias }),
        {
            body: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            }),
            query: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            }),
            headers: t.Object({
                username: t.String(),
                alias: t.Literal('Kristen')
            })
        }
    )
    .get('/async', async ({ error }) => {
        if (Math.random() > 0.5) return error(418, 'Nagisa')
        if (Math.random() > 0.5) return error(401, 'Himari')

        return 'Hifumi'
    })
    .use(plugin)

const api = treaty(app)
type api = typeof api

type Result<T extends Function> = T extends (...args: any[]) => infer R
    ? Awaited<R>
    : never

type ValidationError = {
    data: null
    error: {
        status: 422
        value: {
            type: 'validation'
            on: string
            summary?: string
            message?: string
            found?: unknown
            property?: string
            expected?: string
        }
    }
    response: Response
    status: number
    headers: RequestInit['headers']
}

// ? Get should have 1 parameter and is optional when no parameter is defined
{
    type Route = api['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: 'a'
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | {
              data: null
              error: {
                  status: unknown
                  value: unknown
              }
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
    >()
}

// ? Non-get should have 2 parameter and is optional when no parameter is defined
{
    type Route = api['post']

    expectTypeOf<Route>().parameter(0).toBeUnknown()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: 'a'
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | {
              data: null
              error: {
                  status: unknown
                  value: unknown
              }
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
    >()
}

// ? Should return literal
{
    type Route = api['number']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: 1
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | {
              data: null
              error: {
                  status: unknown
                  value: unknown
              }
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
    >()
}

// ? Should return boolean
{
    type Route = api['true']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: boolean
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | {
              data: null
              error: {
                  status: unknown
                  value: unknown
              }
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
    >()
}

// ? Should return array of string
{
    type Route = api['array']['post']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<string[]>()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: string[]
              error: null
              response: Response
              status: number
              headers: RequestInit['headers']
          }
        | ValidationError
    >()
}

// ? Should return body
{
    type Route = api['mirror']['post']

    expectTypeOf<Route>().parameter(0).toBeUnknown()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()
    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: unknown
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | {
              data: null
              error: {
                  status: unknown
                  value: unknown
              }
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
    >()
}

// ? Should return body
{
    type Route = api['body']['post']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<string>()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()
    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: string
              error: null
              response: Response
              status: number
              headers: RequestInit['headers']
          }
        | {
              data: null
              error: {
                  status: 422
                  value: {
                      type: 'validation'
                      on: string
                      summary?: string
                      message?: string
                      found?: unknown
                      property?: string
                      expected?: string
                  }
              }
              response: Response
              status: number
              headers: RequestInit['headers']
          }
    >()
}

// ? Should return body
{
    type Route = api['deep']['nested']['mirror']['post']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<{
        username: string
        password: string
    }>()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  password: string
              }
              error: null
              response: Response
              status: number
              headers: RequestInit['headers']
          }
        | ValidationError
    >()
}

// ? Get should have 1 parameter and is required when query is defined
{
    type Route = api['query']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<{
        headers?: Record<string, unknown> | undefined
        query: {
            username: string
        }
        fetch?: RequestInit | undefined
    }>()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Get should have 1 parameter and is required when query is defined
{
    type Route = api['queries']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<{
        headers?: Record<string, unknown> | undefined
        query: {
            username: string
            alias: 'Kristen'
        }
        fetch?: RequestInit | undefined
    }>()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Post should have 2 parameter and is required when query is defined
{
    type Route = api['queries']['post']

    expectTypeOf<Route>().parameter(0).toBeUnknown()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<{
        headers?: Record<string, unknown> | undefined
        query: {
            username: string
            alias: 'Kristen'
        }
        fetch?: RequestInit | undefined
    }>()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Head should have 1 parameter and is required when query is defined
{
    type Route = api['queries']['head']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<{
        headers?: Record<string, unknown> | undefined
        query: {
            username: string
            alias: 'Kristen'
        }
        fetch?: RequestInit | undefined
    }>()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Should return error
{
    type Route = api['error']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: void
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | {
              data: null
              error:
                  | {
                        status: 418
                        value: 'Kirifuji Nagisa'
                    }
                  | {
                        status: 420
                        value: 'Snoop Dogg'
                    }
                  | {
                        status: 422
                        value: {
                            type: 'validation'
                            on: string
                            summary?: string
                            message?: string
                            found?: unknown
                            property?: string
                            expected?: string
                        }
                    }
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
    >()
}

// ? Get should have 1 parameter and is required when headers is defined
{
    type Route = api['headers']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<{
        headers: {
            username: string
            alias: 'Kristen'
        }
        query?: Record<string, unknown> | undefined
        fetch?: RequestInit | undefined
    }>()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Post should have 2 parameter and is required when headers is defined
{
    type Route = api['headers']['post']

    expectTypeOf<Route>().parameter(0).toBeUnknown()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<{
        headers: {
            username: string
            alias: 'Kristen'
        }
        query?: Record<string, unknown> | undefined
        fetch?: RequestInit | undefined
    }>()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Get should have 1 parameter and is required when queries and headers is defined
{
    type Route = api['queries-headers']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<{
        headers: {
            username: string
            alias: 'Kristen'
        }
        query: {
            username: string
            alias: 'Kristen'
        }
        fetch?: RequestInit | undefined
    }>()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Post should have 2 parameter and is required when queries and headers is defined
{
    type Route = api['queries-headers']['post']

    expectTypeOf<Route>().parameter(0).toBeUnknown()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<{
        headers: {
            username: string
            alias: 'Kristen'
        }
        query: {
            username: string
            alias: 'Kristen'
        }
        fetch?: RequestInit | undefined
    }>()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Post should have 2 parameter and is required when queries, headers and body is defined
{
    type Route = api['body-queries-headers']['post']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<{
        username: string
        alias: 'Kristen'
    }>()

    expectTypeOf<Route>().parameter(1).toEqualTypeOf<{
        headers: {
            username: string
            alias: 'Kristen'
        }
        query: {
            username: string
            alias: 'Kristen'
        }
        fetch?: RequestInit | undefined
    }>()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: {
                  username: string
                  alias: 'Kristen'
              }
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | ValidationError
    >()
}

// ? Should handle async
{
    type Route = api['async']['get']

    expectTypeOf<Route>().parameter(0).toEqualTypeOf<
        | {
              headers?: Record<string, unknown> | undefined
              query?: Record<string, unknown> | undefined
              fetch?: RequestInit | undefined
          }
        | undefined
    >()

    expectTypeOf<Route>().parameter(1).toBeUndefined()

    type Res = Result<Route>

    expectTypeOf<Res>().toEqualTypeOf<
        | {
              data: 'Hifumi'
              error: null
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
        | {
              data: null
              error:
                  | {
                        status: 401
                        value: 'Himari'
                    }
                  | {
                        status: 418
                        value: 'Nagisa'
                    }
              response: Response
              status: number
              headers: HeadersInit | undefined
          }
    >()
}

// ? Handle param with nested path
{
    type SubModule = api['level']

    // expectTypeOf<SubModule>().toEqualTypeOf<
    // 	((params: { id: string | number }) => {
    // 		get: (
    // 			options?:
    // 				| {
    // 						headers?: Record<string, unknown> | undefined
    // 						query?: Record<string, unknown> | undefined
    // 						fetch?: RequestInit | undefined
    // 				  }
    // 				| undefined
    // 		) => Promise<
    // 			| {
    // 					data: string
    // 					error: null
    // 					response: Response
    // 					status: number
    // 					headers: HeadersInit | undefined
    // 			  }
    // 			| ValidationError
    // 		>
    // 		ok: {
    // 			get: (
    // 				options?:
    // 					| {
    // 							headers?: Record<string, unknown> | undefined
    // 							query?: Record<string, unknown> | undefined
    // 							fetch?: RequestInit | undefined
    // 					  }
    // 					| undefined
    // 			) => Promise<
    // 				| {
    // 						data: string
    // 						error: null
    // 						response: Response
    // 						status: number
    // 						headers: HeadersInit | undefined
    // 				  }
    // 				| ValidationError
    // 			>
    // 		}
    // 	}) & {
    // 		index: {
    // 			get: (
    // 				options?:
    // 					| {
    // 							headers?: Record<string, unknown> | undefined
    // 							query?: Record<string, unknown> | undefined
    // 							fetch?: RequestInit | undefined
    // 					  }
    // 					| undefined
    // 			) => Promise<
    // 				| {
    // 						data: '2'
    // 						error: null
    // 						response: Response
    // 						status: number
    // 						headers: HeadersInit | undefined
    // 				  }
    // 				| ValidationError
    // 			>
    // 		}
    // 		level: {
    // 			get: (
    // 				options?:
    // 					| {
    // 							headers?: Record<string, unknown> | undefined
    // 							query?: Record<string, unknown> | undefined
    // 							fetch?: RequestInit | undefined
    // 					  }
    // 					| undefined
    // 			) => Promise<
    // 				| {
    // 						data: '2'
    // 						error: null
    // 						response: Response
    // 						status: number
    // 						headers: HeadersInit | undefined
    // 				  }
    // 				| ValidationError
    // 			>
    // 		}
    // 	}
    // >
}

// ? Return AsyncGenerator on yield
{
    const app = new Elysia().get('', function* () {
        yield 1
        yield 2
        yield 3
    })

    const { data } = await treaty(app).get()

    expectTypeOf<typeof data>().toEqualTypeOf<AsyncGenerator<
        1 | 2 | 3,
        void,
        unknown
    > | null>()
}

// ? Return actual value on generator if not yield
{
    const app = new Elysia().get('', function* () {
        return 'a'
    })

    const { data } = await treaty(app).get()

    expectTypeOf<typeof data>().toEqualTypeOf< AsyncGenerator<never, string, unknown> | null>()
}

// ? Return both actual value and generator if yield and return
{
    const app = new Elysia().get('', function* () {
        if (Math.random() > 0.5) return 'a'

        yield 1
        yield 2
        yield 3
    })

    const { data } = await treaty(app).get()

    expectTypeOf<typeof data>().toEqualTypeOf<AsyncGenerator<
        1 | 2 | 3,
        'a' | undefined,
        unknown
    > | null>()
}

// ? Return AsyncGenerator on yield
{
    const app = new Elysia().get('', async function* () {
        yield 1
        yield 2
        yield 3
    })

    const { data } = await treaty(app).get()

    expectTypeOf<typeof data>().toEqualTypeOf<AsyncGenerator<
        1 | 2 | 3,
        void,
        unknown
    > | null>()
}

// ? Return actual value on generator if not yield
{
    const app = new Elysia().get('', async function* () {
        return 'a'
    })

    const { data } = await treaty(app).get()

    expectTypeOf<typeof data>().toEqualTypeOf<AsyncGenerator<
        never,
        string,
        unknown
    > | null>()
}

// ? Return both actual value and generator if yield and return
{
    const app = new Elysia().get('', async function* () {
        if (Math.random() > 0.5) return 'a'

        yield 1
        yield 2
        yield 3
    })

    const { data } = await treaty(app).get()

    expectTypeOf<typeof data>().toEqualTypeOf<AsyncGenerator<
        1 | 2 | 3,
        'a' | undefined,
        unknown
    > | null>()
}

{
    const app = new Elysia().get('/formdata', () =>
        form({
            image: file('/')
        })
    )

    const { data } = await treaty(app).formdata.get()

    expectTypeOf(data!.image).toEqualTypeOf<File>()
}

// Handle dynamic parameter at root
{
    const app = new Elysia().get('/:id', () => null)

    type App = typeof app

    const edenClient = treaty<App>('http://localhost:3000')

    edenClient({ id: '1' }).get()
}
