import { Elysia, t } from 'elysia'
import { treaty } from '../src'
import { EdenFetchError } from '../src/errors'
import type {
    PluginCallContext,
    PluginCallResult,
    PluginTypeFn,
    PluginVerbContext,
    TreatyPlugin
} from '../src'

import { describe, expect, it, spyOn } from 'bun:test'

const app = new Elysia()
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
    .post('/stamped', ({ set }) => {
        set.headers['x-offset'] = '7'

        return 'ok'
    })
    .get('/item/:id', ({ params: { id } }) => id)
    .delete('/item/:id', ({ params: { id } }) => id)
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

    it('not dispatch a verb named by a path parameter value', async () => {
        const { plugin, calls } = createSync()
        const api = treaty(app).use(plugin)

        const pair = api.pair({ a: 'live' })({ b: 1 })

        expect(calls.length).toBe(0)
        expect(pair['~path']).toBe('/pair/live/1')

        const { data } = await pair.get()

        expect(data).toBe('live-1')
    })

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

            expect(data as unknown).toBe(1)
        })

        it('~path', () => {
            expect(api.todos['~path']).toBe('/todos')
            expect(api.item({ id: 1 })['~path']).toBe('/item/1')
        })

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

const createObserver = (name = 'observer') => {
    const before: PluginCallContext[] = []
    const after: PluginCallResult[] = []

    const plugin: TreatyPlugin = {
        name,
        before(context) {
            before.push(context)
        },
        after(result) {
            after.push(result)
        }
    }

    return { plugin, before, after }
}

describe('Treaty2 - plugin call callback', () => {
    it('observe a mutation before it is sent', async () => {
        const { plugin, before } = createObserver()
        const config = { parseDate: false }
        const api = treaty(app, config).use(plugin)

        const options = { optimistic: () => {} } as any

        await api.todos.post({ text: 'a' }, options)

        expect(before.length).toBe(1)
        expect(before[0].paths).toEqual(['todos'])
        expect(before[0].method).toBe('post')
        expect(before[0].options).toBe(options)
        expect(before[0].config).toBe(config)
        expect(before[0].domain).toBe('http://e.ly')
    })

    it('carry the config identity the verbs receive', async () => {
        const { plugin, before } = createObserver()
        const { plugin: sync, calls } = createSync()

        const api = treaty(app, { parseDate: false }).use(sync).use(plugin)

        api.todos.live()
        await api.todos.post({ text: 'a' })

        expect(before[0].config).toBe(calls[0].context.config)
    })

    it('carry raw path segments', async () => {
        const { plugin, before } = createObserver()
        const api = treaty(app).use(plugin)

        const { data } = await api.item({ id: 'a/b' }).delete()

        expect(data).toBe('a/b')
        expect(before[0].paths).toEqual(['item', 'a/b'])
        expect(before[0].method).toBe('delete')
    })

    it('observe every mutation verb and no read', async () => {
        const methods = new Elysia()
            .get('/x', () => 'a')
            .head('/x', () => 'a')
            .post('/x', () => 'a')
            .put('/x', () => 'a')
            .patch('/x', () => 'a')
            .delete('/x', () => 'a')

        const { plugin, before, after } = createObserver()
        const api = treaty(methods).use(plugin)

        await api.x.get()
        await api.x.head()

        expect(before.length).toBe(0)
        expect(after.length).toBe(0)

        await api.x.post()
        await api.x.put()
        await api.x.patch()
        await api.x.delete()

        expect(before.map((call) => call.method)).toEqual([
            'post',
            'put',
            'patch',
            'delete'
        ])
        expect(after.length).toBe(4)
    })

    it('not observe a plugin verb dispatch', () => {
        const { plugin: sync } = createSync()
        const { plugin, before, after } = createObserver()

        treaty(app).use(sync).use(plugin).todos.live()

        expect(before.length).toBe(0)
        expect(after.length).toBe(0)
    })

    it('observe the result the caller receives', async () => {
        const { plugin, after } = createObserver()
        const api = treaty(app).use(plugin)

        const result = await api.stamped.post()

        expect(after.length).toBe(1)
        expect(after[0]).toBe(result as unknown as PluginCallResult)
        expect(after[0].data).toBe('ok')
        expect(after[0].error).toBeNull()
        expect(after[0].status).toBe(200)
        expect(after[0].headers?.get('x-offset')).toBe('7')
    })

    it('observe a resolved error result', async () => {
        const { plugin, after } = createObserver()
        const api = treaty(app).use(plugin)

        // @ts-expect-error deliberately invalid body
        const { error } = await api.todos.post({})

        expect(after.length).toBe(1)
        expect(after[0].status).toBe(422)
        expect(after[0].error).toBe(error as unknown as EdenFetchError)
        expect(after[0].data).toBeNull()
    })

    it('observe a result that throwHttpError throws', async () => {
        const { plugin, after } = createObserver()
        const api = treaty(app, { throwHttpError: true }).use(plugin)

        let thrown: unknown

        try {
            // @ts-expect-error deliberately invalid body
            await api.todos.post({})
        } catch (error) {
            thrown = error
        }

        expect(thrown).toBeInstanceOf(EdenFetchError)
        expect(after.length).toBe(1)
        expect(after[0].error).toBe(thrown as EdenFetchError)
        expect(after[0].status).toBe(422)
        expect(after[0].data).toBeNull()
    })

    it('observe the fabricated result of a request that never left', async () => {
        const { plugin, after } = createObserver()
        const api = treaty<typeof app>('http://localhost:59999').use(plugin)

        const { error } = await api.todos.post({ text: 'a' })

        expect(after.length).toBe(1)
        expect(after[0].status).toBe(503)
        expect(after[0].error).toBe(error as unknown as EdenFetchError)
        expect(after[0].response).toBeUndefined()
        expect(after[0].headers).toBeUndefined()
    })

    it('observe a network failure that throwHttpError throws', async () => {
        const { plugin, after } = createObserver()
        const api = treaty<typeof app>('http://localhost:59999', {
            throwHttpError: true
        }).use(plugin)

        let thrown: unknown

        try {
            await api.todos.post({ text: 'a' })
        } catch (error) {
            thrown = error
        }

        expect(thrown).toBeInstanceOf(EdenFetchError)
        expect(after.length).toBe(1)
        expect(after[0].error).toBe(thrown as EdenFetchError)
        expect(after[0].status).toBe(503)
    })

    it('pair a result with the call that produced it', async () => {
        const timed = new Elysia()
            .post('/slow', async () => {
                await Bun.sleep(20)

                return 'slow'
            })
            .post('/fast', () => 'fast')

        const staged: PluginCallContext[] = []
        const settled: [PluginCallResult, PluginCallContext][] = []

        const api = treaty(timed).use({
            name: 'pairing',
            before(context) {
                staged.push(context)
            },
            after(result, context) {
                settled.push([result, context])
            }
        })

        await Promise.all([api.slow.post(), api.fast.post()])

        expect(staged.map((call) => call.paths[0])).toEqual(['slow', 'fast'])
        expect(settled.map(([result]) => result.data)).toEqual(['fast', 'slow'])
        expect(settled[0][1]).toBe(staged[1])
        expect(settled[1][1]).toBe(staged[0])
    })

    it('run callbacks in registration order', async () => {
        const order: string[] = []
        const record = (name: string): TreatyPlugin => ({
            name,
            before: () => order.push(`${name}:before`),
            after: () => order.push(`${name}:after`)
        })

        const api = treaty(app).use(record('first')).use(record('second'))

        await api.todos.post({ text: 'a' })

        expect(order).toEqual([
            'first:before',
            'second:before',
            'first:after',
            'second:after'
        ])
    })

    it('survive a throwing after', async () => {
        const errors = spyOn(console, 'error').mockImplementation(() => {})

        const { plugin, before, after } = createObserver()
        const api = treaty(app)
            .use({
                name: 'broken',
                after: () => {
                    throw new Error('after')
                }
            })
            .use(plugin)

        const { data, error } = await api.todos.post({ text: 'a' })

        expect(data).toEqual({ text: 'a' })
        expect(error).toBeNull()
        expect(before.length).toBe(1)
        expect(after.length).toBe(1)
        expect(errors).toHaveBeenCalledTimes(1)

        errors.mockRestore()
    })

    it('veto the call when before throws', async () => {
        const staged = createObserver('staged')
        const later = createObserver('later')

        const api = treaty(app)
            .use(staged.plugin)
            .use({
                name: 'broken',
                before: () => {
                    throw new Error('veto')
                }
            })
            .use(later.plugin)

        await expect(api.todos.post({ text: 'a' })).rejects.toThrow('veto')

        expect(staged.before.length).toBe(1)
        expect(later.before.length).toBe(0)

        expect(staged.after.length).toBe(1)
        expect(later.after.length).toBe(1)
        expect(staged.after[0].status).toBe(0)
        expect(staged.after[0].error).toBeInstanceOf(EdenFetchError)
        expect(staged.after[0].response).toBeUndefined()
    })

    describe('settle every escaping throw', () => {
        const settlements = async (
            run: (api: any) => Promise<unknown>,
            config: Record<string, any> = {}
        ) => {
            const { plugin, before, after } = createObserver()
            const api = treaty(app, config).use(plugin)

            await expect(run(api)).rejects.toBeDefined()

            expect(before.length).toBe(1)

            return after
        }

        it('a throwing onRequest interceptor', async () => {
            const after = await settlements(
                (api) => api.todos.post({ text: 'a' }),
                {
                    onRequest: () => {
                        throw new Error('interceptor')
                    }
                }
            )

            expect(after.length).toBe(1)
            expect(after[0].status).toBe(0)
            expect(after[0].error).not.toBeNull()
            expect(after[0].response).toBeUndefined()
            expect(after[0].headers).toBeUndefined()
        })

        it('a throwing header function', async () => {
            const after = await settlements(
                (api) => api.todos.post({ text: 'a' }),
                {
                    headers: () => {
                        throw new Error('headers')
                    }
                }
            )

            expect(after.length).toBe(1)
            expect(after[0].error).not.toBeNull()
        })

        it('a body that cannot be serialized', async () => {
            const body: Record<string, unknown> = { text: 'a' }
            body.self = body

            const after = await settlements((api) => api.todos.post(body))

            expect(after.length).toBe(1)
            expect(after[0].error).not.toBeNull()
        })

        it('a 2xx carrying malformed JSON', async () => {
            const malformed = new Elysia().post(
                '/todos',
                () =>
                    new Response('{', {
                        headers: { 'content-type': 'application/json' }
                    })
            )

            const { plugin, after } = createObserver()
            const api = treaty(malformed).use(plugin)

            await expect(api.todos.post({ text: 'a' })).rejects.toBeDefined()

            expect(after.length).toBe(1)
            expect(after[0].status).toBe(0)
        })
    })

    it('throw when a plugin carries neither a verb nor a callback', () => {
        expect(() => treaty(app).use({ name: 'empty' })).toThrow(
            'must have a "name"'
        )
    })

    it('not leak a callback into the instance it was registered from', async () => {
        const { plugin, before } = createObserver()
        const api = treaty(app)

        api.use(plugin)

        await api.todos.post({ text: 'a' })

        expect(before.length).toBe(0)
    })
})
