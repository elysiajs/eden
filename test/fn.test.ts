import { Elysia } from 'elysia'
import { describe, expect, it } from 'bun:test'

import { edenFn } from '../src'

const app = new Elysia()
    .state('version', 1)
    .decorate('getVersion', () => 1)
    .decorate('mirrorDecorator', <T>(v: T) => v)
    .fn(({ getVersion, mirrorDecorator, store: { version } }) => ({
        ping: () => 'pong',
        mirror: async <T>(value: T) => value,
        version: () => version,
        getVersion,
        mirrorDecorator,
        nested: {
            data() {
                return 'a'
            }
        }
    }))
    .fn(({ permission }) => ({
        authorized: permission({
            value: () => 'authorized',
            check({ request: { headers } }) {
                if (!headers.has('Authorization'))
                    throw new Error('Authorization is required')
            }
        }),
        prisma: permission({
            value: {
                user: {
                    create<T extends string>(name: T) {
                        return name
                    },
                    delete<T extends string>(name: T) {
                        return name
                    }
                }
            },
            check({ key, params }) {
                if (key === 'user.delete' && params[0] === 'Arona')
                    throw new Error('Forbidden')
            }
        })
    }))
    .listen(8080)

await app.modules

const fn = edenFn<typeof app>('http://localhost:8080')

describe('Eden Fn', () => {
    it('ping', async () => {
        expect(await fn.ping()).toBe('pong')
    })

    it('extends SuperJSON', async () => {
        const set = new Set([1, 2, 3])

        expect(await fn.mirror(set)).toEqual(set)
    })

    it('handle falsey value', async () => {
        expect(await fn.mirror(0)).toEqual(0)
        expect(await fn.mirror(false)).toEqual(false)
        expect(await fn.mirror(null)).toEqual(null)
    })

    it('accept accept new headers', async () => {
        const fn$ = fn.$clone({
            fetch: {
                headers: {
                    Authorization: 'Ar1s'
                }
            }
        })

        expect(await fn$.authorized()).toEqual('authorized')
    })

    it('update config', async () => {
        const fn$ = fn.$clone()

        await fn$.$set({
            fetch: {
                headers: {
                    Authorization: 'Ar1s'
                }
            }
        })

        expect(await fn$.authorized()).toEqual('authorized')
    })

    // New Error get thrown in Bun 0.6+
    // it('handle error', async () => {
    //     const valid = fn.mirror(1)
    //     const invalid = fn.authorized().catch((err) => {
    //         return err
    //     })

    //     expect([await valid, await invalid]).toEqual([
    //         1,
    //         new Error('Authorization is required')
    //     ])
    // })

    it('handle concurrent request', async () => {
        const arr = new Array(100).fill(null).map((x, i) => i)

        expect(await Promise.all(arr.map((x) => fn.mirror(x)))).toEqual(arr)
    })

    it('multiple batch', async () => {
        expect(await fn.mirror(0)).toEqual(0)

        await new Promise((resolve) => setTimeout(resolve, 50))

        expect(await fn.mirror(0)).toEqual(0)
    })

    it('custom path', async () => {
        const app = new Elysia({
            fn: '/custom'
        })
            .fn(() => ({
                mirror: async <T>(value: T) => value
            }))
            .listen(8081)

        const fn = edenFn<typeof app>('http://localhost:8081', {
            fn: '/custom'
        })

        expect(await fn.mirror(0)).toEqual(0)
    })
})
