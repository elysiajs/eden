/* eslint-disable @typescript-eslint/no-unused-vars */
import { Elysia, form, t } from 'elysia'
import { edenFetch } from '../src'
import { EdenFetchError } from '../src/errors'

import { describe, expect, it, beforeAll } from 'bun:test'

const json = {
    name: 'Saori',
    affiliation: 'Arius',
    type: 'Striker'
}

const app = new Elysia()
    .get('/', () => 'hi')
    .post('/', () => 'post')
    .post('/form-data', ({ body }) => {
        return {
            file: body.file.name,
            size: body.file.size
        }
    }, {
        body: t.Object({
            file: t.File()
        }),
        parse: 'formdata'
    })
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
    .get(
        '/with-query',
        ({ query }) => {
            return {
                query
            }
        },
        {
            query: t.Object({
                q: t.String()
            })
        }
    )
    .get(
        '/with-query-undefined',
        ({ query }) => {
            return {
                query
            }
        },
        {
            query: t.Object({
                q: t.Undefined(t.String())
            })
        }
    )
    .get(
        '/with-query-nullish',
        ({ query }) => {
            return {
                query
            }
        },
        {
            query: t.Object({
                q: t.Nullable(t.String())
            })
        }
    )
    .listen(8081)

const fetch = edenFetch<typeof app>('http://localhost:8081')

describe('Eden Fetch', () => {
    it('get by default', async () => {
        const { data } = await fetch('/', {})

        expect(data).toBe('hi')
    })

    it('post', async () => {
        const { data } = await fetch('/', {
            method: 'POST'
        })

        expect(data).toBe('post')
    })

    it('parse json', async () => {
        const { data } = await fetch('/json', {})

        expect(data).toEqual(json)
    })

    it('parse json with additional parameters', async () => {
        const { data } = await fetch('/json-utf8', {})

        expect(data).toEqual(json)
    })

    it('send parameters', async () => {
        const { data } = await fetch('/name/:name', {
            params: {
                name: 'Elysia'
            }
        })

        expect(data).toEqual('Elysia')
    })

    it('send headers', async () => {
        const { data } = await fetch('/headers', {
            method: 'POST',
            headers: {
                'x-affiliation': 'Arius'
            },
            query: {}
        })

        expect(data).toEqual('Arius')
    })

    it('parse number', async () => {
        const { data } = await fetch('/number', {})

        expect(data).toEqual(1)
    })

    it('parse true', async () => {
        const { data } = await fetch('/true', {})

        expect(data).toEqual(true)
    })

    it('parse false', async () => {
        const { data } = await fetch('/false', {})

        expect(data).toEqual(false)
    })

    it('parse form data', async () => {
        const formData = new FormData();
        formData.append('file', new File(['test'], 'test.txt', { type: 'text/plain' }))

        const { data } = await fetch('/form-data', {
            method: 'POST',
            // @ts-ignore
            body: formData
        })

        expect(data).toEqual({
            file: 'test.txt',
            size: 4
        })
    })

    // ! FIX ME
    // it('handle throw error', async () => {
    //     const { data, error } = await fetch('/throw-error', {
    //         method: 'GET'
    //     })

    //     expect(error instanceof Error).toEqual(true)

    //     expect(error?.value).toEqual('hare')
    // })

    it('scope down error', async () => {
        const { data, error } = await fetch('/direct-error', {})

        expect(error instanceof Error).toEqual(true)

        if (error)
            switch (error.status) {
                case 500:
                    expect(error.value).toEqual('hare')
            }
    })

    it('send query', async () => {
        const { data, error } = await fetch('/with-query', {
            query: {
                q: 'A'
            }
        })
        expect(data?.query.q).toBe('A')
    })

    it('send undefined query', async () => {
        const { data, error } = await fetch('/with-query-undefined', {
            query: {
                q: undefined
            }
        })
        expect(data?.query.q).toBeUndefined()
        expect(error).toBeNull()
    })

    // t.Nullable is impossible to represent with query params
    // without elysia specifically parsing 'null'
    it('send null query', async () => {
        const { data, error } = await fetch('/with-query-nullish', {
            query: {
                q: null
            }
        })
        expect(data?.query.q).toBeUndefined()
        expect(error?.status).toBe(422)
        expect(error?.value.type).toBe("validation")
    })
})

describe('Eden Fetch - Server offline', () => {
    const offlineFetch = edenFetch<typeof app>('http://localhost:59999')
    it('should return network error in error field when server is offline', async () => {
        const { data, error, status } = await offlineFetch('', {})

        expect(data).toBeNull()
        expect(error).toBeInstanceOf(EdenFetchError)
        expect(error?.status).toBe(503)
        expect(status).toBe(503)
        expect(error?.value).toBeInstanceOf(Error)
    })

    it('should return network error for POST requests when server is offline', async () => {
        const { data, error, status } = await offlineFetch('', {
            method: 'POST'
        })

        expect(data).toBeNull()
        expect(error).toBeInstanceOf(EdenFetchError)
        expect(error?.status).toBe(503)
        expect(status).toBe(503)
        expect(error?.value).toBeInstanceOf(Error)
    })

    it('should allow retry after network error', async () => {
        const result = await offlineFetch('', {})

        expect(result.error).toBeInstanceOf(EdenFetchError)
        expect(typeof result.retry).toBe('function')
    })
})

describe('Eden Fetch - throwHttpErrors', () => {
    // Config-level tests
    it('throws HTTP errors when config throwHttpErrors is true', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:8081', { throwHttpErrors: true })
        expect(fetch('/direct-error', {})).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('throws network errors when config throwHttpErrors is true', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:59999', { throwHttpErrors: true })
        expect(fetch('', {})).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('returns error in result when config throwHttpErrors is false', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:8081', { throwHttpErrors: false })
        const { error } = await fetch('/direct-error', {})
        expect(error?.status).toBe(500)
    })

    it('throws selectively when config throwHttpErrors is a function', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:8081', {
            throwHttpErrors: (e) => e.status === 500
        })
        expect(fetch('/direct-error', {})).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('does not throw when config function returns false', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:8081', {
            throwHttpErrors: (e) => e.status === 404
        })
        const { error } = await fetch('/direct-error', {})
        expect(error?.status).toBe(500)
    })

    // Per-request override tests
    it('per-request true overrides config false', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:8081', { throwHttpErrors: false })
        expect(fetch('/direct-error', { throwHttpErrors: true })).rejects.toBeInstanceOf(EdenFetchError)
    })

    it('per-request false overrides config true', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:8081', { throwHttpErrors: true })
        const { error } = await fetch('/direct-error', { throwHttpErrors: false })
        expect(error?.status).toBe(500)
    })

    it('per-request function overrides config boolean', async () => {
        const fetch = edenFetch<typeof app>('http://localhost:8081', { throwHttpErrors: true })
        const { error } = await fetch('/direct-error', { throwHttpErrors: (e) => e.status === 404 })
        expect(error?.status).toBe(500)
    })
})
