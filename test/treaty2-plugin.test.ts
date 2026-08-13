import { Elysia, t } from 'elysia'
import { treaty } from '../src'
import type { PluginTypeFn, PluginVerbContext, TreatyPlugin } from '../src'

import { describe, expect, it } from 'bun:test'

const app = new Elysia()
    // ? the same macro the type test gates on. `meta` is compile-time only, so
    // ? a marked route must behave exactly like an unmarked one at runtime
    .macro({ live: { meta: { live: true } as const } })
    .get('/todos', { live: true }, () => [{ id: 1, text: 'a' }])
    .post(
        '/todos',
        {
            body: t.Object({
                text: t.String()
            })
        },
        ({ body }) => body
    )
    .get('/item/:id', ({ params: { id } }) => id)
    .get('/pair/:a/:b', ({ params: { a, b } }) => `${a}-${b}`)

interface LiveHandle {
    readonly data: unknown
    readonly status: 'connecting'
    close(): void
}

interface SyncTypeFn extends PluginTypeFn {
    output: {
        live: (options?: { query?: Record<string, string> }) => LiveHandle
    }
}

interface OtherTypeFn extends PluginTypeFn {
    output: {
        cached: () => 'cached'
    }
}

const handle: LiveHandle = {
    data: undefined,
    status: 'connecting',
    close() {}
}

const createSync = () => {
    const calls: { context: PluginVerbContext; args: unknown[] }[] = []

    const plugin: TreatyPlugin<SyncTypeFn> = {
        name: 'sync',
        verbs: {
            live(context, ...args) {
                calls.push({ context, args })

                return handle
            }
        }
    }

    return { plugin, calls }
}

describe('Treaty2 - plugin', () => {
    it('dispatch a plugin verb with the route context', () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        expect(api.todos.live()).toBe(handle)

        expect(calls.length).toBe(1)
        expect(calls[0].context.path).toBe('/todos')
        expect(calls[0].context.paths).toEqual(['todos'])
        expect(calls[0].args).toEqual([])
    })

    it('forward every argument to the plugin verb', () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        expect(api.todos.live({ query: { list: 'work' } })).toBe(handle)

        expect(calls.length).toBe(1)
        expect(calls[0].args).toEqual([{ query: { list: 'work' } }])
    })

    // ! A single-key object argument is otherwise parsed as a path parameter,
    // ! which is why the dispatch must precede the request path
    it('dispatch a single-key object argument instead of parsing it as a path parameter', () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        api.todos.live({ query: { list: 'work' } })

        expect(calls[0].context.path).toBe('/todos')
    })

    it('dispatch under a path parameter', () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        expect(api.item({ id: 1 }).live()).toBe(handle)

        expect(calls[0].context.path).toBe('/item/1')
        expect(calls[0].context.paths).toEqual(['item', '1'])
    })

    // ! A path parameter is user data. If its value could name a verb, the
    // ! caller of `api.pair({ a: 'live' })({ b: 1 })` would hand control of the
    // ! dispatch to whatever `a` happens to hold
    it('not dispatch a verb named by a path parameter value', async () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        const pair = api.pair({ a: 'live' })({ b: 1 })

        expect(calls.length).toBe(0)
        expect(pair['~path']).toBe('/pair/live/1')

        const { data } = await pair.get()

        expect(data).toBe('live-1')
    })

    // ! A non-object argument returns the same node, so the last segment is
    // ! still the parameter value and must stay untrusted
    it('keep a path parameter value untrusted across a non-object call', async () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        const node = (
            api.pair({ a: 'live' }) as unknown as (
                value: string
            ) => (() => unknown) & { '~path': string }
        )('x')

        expect(node['~path']).toBe('/pair/live')

        await node()

        expect(calls.length).toBe(0)
    })

    it('dispatch at the root', () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        api.live()

        expect(calls[0].context.path).toBe('/')
        expect(calls[0].context.paths).toEqual([])
    })

    it('provide domain, config and elysia instance to the plugin verb', () => {
        const { plugin, calls } = createSync()
        const config = { parseDate: false }

        treaty(app, config).use(plugin).todos.live()

        expect(calls[0].context.domain).toBe('http://e.ly')
        expect(calls[0].context.config).toBe(config)
        expect(calls[0].context.elysia).toBe(app)
    })

    it('provide the resolved domain when constructed from an url', () => {
        const { plugin, calls } = createSync()

        treaty<typeof app>('localhost:3000').use(plugin).todos.live()

        expect(calls[0].context.domain).toBe('http://localhost:3000')
        expect(calls[0].context.elysia).toBeUndefined()
    })

    it('merge verbs of chained plugins', () => {
        const { plugin, calls } = createSync()
        const other: TreatyPlugin<OtherTypeFn> = {
            name: 'other',
            verbs: {
                cached: () => 'cached' as const
            }
        }

        const api = treaty(app).use(plugin).use(other)

        expect(api.todos.live()).toBe(handle)
        expect(api.todos.cached()).toBe('cached')
        expect(calls.length).toBe(1)
    })

    // ! `.use` must not mutate the instance it was called on
    it('not leak a verb into the instance it was registered from', async () => {
        const other: TreatyPlugin<OtherTypeFn> = {
            name: 'other',
            verbs: {
                cached: () => 'cached' as const
            }
        }

        const api = treaty(app).use(createSync().plugin)
        api.use(other)

        // @ts-expect-error `other` is only registered on the returned instance
        const response = await api.todos.cached()

        expect(response).not.toBe('cached')
    })

    it('throw when a plugin verb shadows a built-in method', () => {
        expect(() =>
            treaty(app).use({
                name: 'evil',
                verbs: {
                    get: () => 'hijacked'
                }
            })
        ).toThrow('cannot register verb "get"')
    })

    it('throw when a plugin verb shadows a reserved name', () => {
        expect(() =>
            treaty(app).use({
                name: 'evil',
                verbs: {
                    use: () => 'hijacked'
                }
            })
        ).toThrow('cannot register verb "use"')
    })

    it('throw when two plugins register the same verb', () => {
        const api = treaty(app).use(createSync().plugin)

        expect(() =>
            api.use({
                name: 'copycat',
                verbs: {
                    live: () => 'hijacked'
                }
            })
        ).toThrow('already registered by plugin "sync"')
    })

    describe('non-regression', () => {
        const { plugin } = createSync()
        const api = treaty(app).use(plugin)

        it('get', async () => {
            const { data, error } = await api.todos.get()

            expect(data).toEqual([{ id: 1, text: 'a' }])
            expect(error).toBeNull()
        })

        it('post', async () => {
            const { data, error } = await api.todos.post({ text: 'b' })

            expect(data).toEqual({ text: 'b' })
            expect(error).toBeNull()
        })

        it('path parameter', async () => {
            const { data } = await api.item({ id: 1 }).get()

            // ? typed `string` (the handler returns the `id` param), but
            // ? parseStringifiedValue turns "1" into the number 1 at runtime
            expect(data as unknown).toBe(1)
        })

        it('~path', () => {
            expect(api.todos['~path']).toBe('/todos')
            expect(api.item({ id: 1 })['~path']).toBe('/item/1')
        })

        // ! an unregistered name is still treated as an http verb, as before
        it('no dispatch without a registered plugin', async () => {
            const { calls } = createSync()
            const bare = treaty(app)

            // @ts-expect-error no plugin registered, so `live` is a request
            const request = bare.todos.live()

            expect(request).toBeInstanceOf(Promise)
            expect(await request).toHaveProperty('response')
            expect(calls.length).toBe(0)
        })
    })
})
