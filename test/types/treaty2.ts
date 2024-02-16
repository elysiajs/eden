import { Elysia, t } from 'elysia'
import { treaty } from '../../src'
import { expectTypeOf } from 'expect-type'

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

const api = treaty(app)
type api = typeof api

type Result<T extends Function> = T extends (...args: any[]) => infer R
    ? Awaited<R>
    : never

// ? Get should have 1 parameter and is optional when no parameter is defined
{
    type Route = api['index']['get']

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
          }
        | {
              data: null
              error: never
          }
    >()
}

// ? Non-get should have 2 parameter and is optional when no parameter is defined
{
    type Route = api['index']['post']

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
          }
        | {
              data: null
              error: never
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
          }
        | {
              data: null
              error: never
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
          }
        | {
              data: null
              error: never
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
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
          }
        | {
              data: null
              error: never
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
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
          }
        | {
              data: null
              error: never
          }
    >()
}
