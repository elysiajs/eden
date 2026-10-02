import { Elysia, t } from 'elysia'
import { expectTypeOf } from 'expect-type'

import { createPlugin, treaty } from '../../src'
import type {
	ApplyPluginTypeFn,
	ApplyPlugins,
	ExtractPluginTypeFn,
	PluginTypeFn,
	PluginVerbContext,
	TreatyPlugin
} from '../../src'

interface Todo {
	id: number
	text: string
}

interface User {
	id: number
	name: string
}

const app = new Elysia()
	.macro({ live: { meta: { live: true } as const } })
	.get(
		'/todos',
		{ live: true, query: t.Object({ list: t.Optional(t.String()) }) },
		() => [{ id: 1, text: 'a' }] as Todo[]
	)
	.post(
		'/todos',
		{ body: t.Object({ text: t.String() }) },
		({ body }) => ({ id: 1, ...body }) as Todo
	)
	.get('/users', () => [] as User[])
	.post('/logs', { body: t.Object({ message: t.String() }) }, () => 'ok')
	.get('/item/:id', { live: true }, () => ({ id: 1, text: 'a' }) as Todo)
	.get('/order', { live: true }, () => [{ id: 1, text: 'a' }] as Todo[])
	.get('/order/:id', { live: true }, () => ({ id: 1, text: 'a' }) as Todo)

type App = typeof app
type Routes = App['~Routes']

interface LiveHandle<T> {
	readonly data: T | undefined
	readonly status: 'connecting' | 'live' | 'reconnecting' | 'closed'
	subscribe(fn: (snapshot: T) => void): () => void
	[Symbol.asyncIterator](): AsyncIterator<T>
	close(): void
}

interface SyncTypeFn extends PluginTypeFn {
	output: this['node'] extends {
		get: {
			meta: { live: true }
			query: infer Q
			response: infer R extends Record<number, unknown>
		}
	}
		? { live: (options?: { query?: Q }) => LiveHandle<R[200]> }
		: {}
}

interface CacheHandle<T> {
	readonly value: T | undefined
	invalidate(): void
}

interface CacheTypeFn extends PluginTypeFn {
	output: this['node'] extends {
		post: { response: infer R extends Record<number, unknown> }
	}
		? { cached: () => CacheHandle<R[200]> }
		: {}
}

interface HeadTypeFn extends PluginTypeFn {
	output: this['node'] extends { get: { meta: { live: true } } }
		? this['head'] extends infer Head
			? { withAuth: (head: Head) => void }
			: never
		: {}
}

declare const sync: TreatyPlugin<SyncTypeFn>
declare const cache: TreatyPlugin<CacheTypeFn>
declare const head: TreatyPlugin<HeadTypeFn>

// compared through `ApplyPluginTypeFn`, since two type fns whose `output` is
// deferred on `this['node']` are structurally equal until applied
expectTypeOf<
	ApplyPluginTypeFn<ExtractPluginTypeFn<typeof sync>, Routes['todos'], {}>
>().toEqualTypeOf<{
	live: (options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
}>()

expectTypeOf<ExtractPluginTypeFn<{ name: string; verbs: {} }>>().toBeNever()

// `never` is assignable to everything, so without the guard a missing route
// node would match the live branch and leak a verb with `unknown` payloads
expectTypeOf<ApplyPluginTypeFn<SyncTypeFn, never, {}>>().toEqualTypeOf<{}>()

// ...and a `never` type fn (a plugin carrying no `'~fn'`) would collapse the
// whole route node to `never`, taking the entire surface down with it
expectTypeOf<
	ApplyPluginTypeFn<never, { get: { meta: { live: true } } }, {}>
>().toEqualTypeOf<{}>()

expectTypeOf<ApplyPlugins<[], Routes['todos'], {}>>().toEqualTypeOf<{}>()

// ! registration
const bare = treaty<App>('localhost')
const api = treaty<App>('localhost').use(sync)
const both = treaty<App>('localhost').use(sync).use(cache)

// ? plugin verb is gated on the live marker
expectTypeOf(api.todos.live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()
expectTypeOf(api.todos.live({ query: { list: 'work' } })).toEqualTypeOf<
	LiveHandle<Todo[]>
>()
expectTypeOf(api.todos.live().data).toEqualTypeOf<Todo[] | undefined>()

// @ts-expect-error `users` carries no live marker
api.users.live

// @ts-expect-error the verb only exists once the plugin is registered
bare.todos.live

// ? under a path parameter
expectTypeOf(api.item({ id: 1 }).live).toEqualTypeOf<
	(options?: { query?: {} }) => LiveHandle<Todo>
>()

// @ts-expect-error `item` itself has no `get`
api.item.live

// a node carrying both its own methods and a `:param` child keeps both
// surfaces, via the second of the two fold sites
expectTypeOf(api.order.live).toEqualTypeOf<
	(options?: { query?: {} }) => LiveHandle<Todo[]>
>()
expectTypeOf(api.order({ id: 1 }).live).toEqualTypeOf<
	(options?: { query?: {} }) => LiveHandle<Todo>
>()

// ? chained `.use` merges every plugin's output
expectTypeOf(both.todos.live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()
expectTypeOf(both.todos.cached).toEqualTypeOf<() => CacheHandle<Todo>>()

// @ts-expect-error `cache` is not registered on `api`
api.todos.cached

// @ts-expect-error `users` has no `post`
both.users.cached

// ? registration is still chainable after the fact
expectTypeOf(api.use(cache).todos.cached).toEqualTypeOf<
	() => CacheHandle<Todo>
>()

// ? 2e. the client-level `Head` reaches the type fn

// A verb mirroring a route's call shape cannot describe its headers without
// knowing which ones the client already prebound
const withHead = treaty<App, { authorization: string }>('localhost').use(head)

expectTypeOf(withHead.todos.withAuth).toEqualTypeOf<
	(head: { authorization: string }) => void
>()

// ...at both fold sites
expectTypeOf(withHead.order.withAuth).toEqualTypeOf<
	(head: { authorization: string }) => void
>()

// ...and defaults to `{}` rather than leaking `unknown` when none is bound
expectTypeOf(treaty<App>('localhost').use(head).todos.withAuth).toEqualTypeOf<
	(head: {}) => void
>()

// @ts-expect-error still gated on the live marker
withHead.users.withAuth

// a type fn that never mentions `head` is unaffected by one being bound
expectTypeOf(
	treaty<App, { authorization: string }>('localhost').use(sync).todos.live
).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()

// ! the ordinary Treaty surface is untouched
expectTypeOf(api.todos.get).toBeCallableWith({ query: { list: 'work' } })
expectTypeOf((await api.todos.get()).data).toEqualTypeOf<Todo[] | null>()
// ? elysia owns the 422 payload shape, so the assertion pins the mapping
// ? (status keyed to its `response` entry), not the shape itself
expectTypeOf((await api.todos.get()).error).toEqualTypeOf<null | {
	status: 422
	value: Routes['todos']['get']['response'][422]
}>()
expectTypeOf(api.todos.post).toBeCallableWith({ text: 'a' })
expectTypeOf(
	(await api.todos.post({ text: 'a' })).data
).toEqualTypeOf<Todo | null>()
expectTypeOf((await api.users.get()).data).toEqualTypeOf<User[] | null>()
expectTypeOf(api.item).toBeCallableWith({ id: 1 })
expectTypeOf(
	(await api.item({ id: 1 }).get()).data
).toEqualTypeOf<Todo | null>()

expectTypeOf(api.todos['~path']).toEqualTypeOf<string>()
expectTypeOf(api.item({ id: 1 })['~path']).toEqualTypeOf<string>()

// ! `Fns = []` must be byte-identical to the pre-plugin surface
expectTypeOf(bare.todos.get).toBeCallableWith({ query: { list: 'work' } })
expectTypeOf((await bare.todos.get()).data).toEqualTypeOf<Todo[] | null>()
expectTypeOf(bare.todos['~path']).toEqualTypeOf<string>()

// ! A plugin carrying no `'~fn'` adds no verbs, and does NOT poison the
// ! surface (an unguarded `never` type fn would make every node `never`)

const untyped = treaty<App>('localhost').use({
	name: 'untyped',
	verbs: { live: () => ({}) }
})

expectTypeOf((await untyped.todos.get()).data).toEqualTypeOf<Todo[] | null>()

// @ts-expect-error no type fn was declared, so no verb is contributed
untyped.todos.live

interface OptimisticTypeFn extends PluginTypeFn {
	output: {}
	callOptions: this['node'] extends {
		get: { meta: { live: true } }
		post: { response: infer R extends Record<number, unknown> }
	}
		? { optimistic?: (draft: R[200]) => R[200] }
		: {}
}

declare const optimistic: TreatyPlugin<OptimisticTypeFn>

const withOptimistic = treaty<App>('localhost').use(optimistic)

withOptimistic.todos.post(
	{ text: 'a' },
	{
		// ? typed from the route node
		optimistic: (draft) => {
			expectTypeOf(draft).toEqualTypeOf<Todo>()

			return draft
		}
	}
)

// ? the built-in options are untouched
withOptimistic.todos.post({ text: 'a' }, { fetch: { keepalive: true } })

// @ts-expect-error the node carries no live marker, so no option is contributed
withOptimistic.logs.post({ message: 'a' }, { optimistic: (draft) => draft })

// @ts-expect-error a read is not a mutation
withOptimistic.todos.get({ optimistic: (draft) => draft })

// @ts-expect-error the option arrives with the plugin
bare.todos.post({ text: 'a' }, { optimistic: (draft) => draft })

// ? a type fn contributing no `callOptions` leaves the options alone
// @ts-expect-error `sync` contributes verbs, not options
api.todos.post({ text: 'a' }, { optimistic: (draft) => draft })

// ! back-compat: a type fn declared STRUCTURALLY (not by extending
// ! `PluginTypeFn`) against an Eden that predates `callOptions` has no such
// ! member. It must still satisfy the constraint, and contribute nothing
interface StructuralTypeFn {
	node: unknown
	head: unknown
	output: this['node'] extends { get: { meta: { live: true } } }
		? { legacy: () => void }
		: {}
}

expectTypeOf<StructuralTypeFn>().toExtend<PluginTypeFn>()

declare const legacy: TreatyPlugin<StructuralTypeFn>

const withLegacy = treaty<App>('localhost').use(legacy)

expectTypeOf(withLegacy.todos.legacy).toEqualTypeOf<() => void>()

// ? no `callOptions` member, so the option surface is the built-in one
withLegacy.todos.post({ text: 'a' }, { fetch: { keepalive: true } })

// @ts-expect-error an absent `callOptions` contributes no option
withLegacy.todos.post({ text: 'a' }, { optimistic: (draft) => draft })

expectTypeOf<
	ApplyPluginTypeFn<StructuralTypeFn, Routes['todos'], {}, 'callOptions'>
>().toEqualTypeOf<{}>()

// ! `plugin()` infers the type fn from the runtime verbs, so no hand-written
// ! type fn is needed. The verbs are node-independent: they land on EVERY node

const inferred = createPlugin({
	name: 'inferred',
	verbs: {
		live(context, options?: { query?: { list?: string } }) {
			// ? the context parameter is typed without an annotation
			expectTypeOf(context).toEqualTypeOf<PluginVerbContext>()

			return {} as LiveHandle<Todo[]>
		},
		// ? a verb taking nothing but the context takes nothing at the call
		ping(context) {
			return context.path
		}
	}
})

const withInferred = treaty<App>('localhost').use(inferred)

// ? the context parameter is dropped, the rest of the signature is kept
expectTypeOf(withInferred.todos.live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()
expectTypeOf(withInferred.todos.ping).toEqualTypeOf<() => string>()

// ? ungated, unlike `sync`: `users` carries no live marker and still has it
expectTypeOf(withInferred.users.live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()

// ? under a path parameter, and at both fold sites
expectTypeOf(withInferred.item({ id: 1 }).live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()
expectTypeOf(withInferred.order.live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()
expectTypeOf(withInferred.order({ id: 1 }).live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()

// ! a plugin carrying no `verbs` contributes NOTHING. `V` falling back to its
// ! constraint instead of `{}` would put an index signature of `any`-argument
// ! verbs on every node, so any key at all would type-check

const noop = createPlugin({
	name: 'noop',
	before() {}
})

const withNoop = treaty<App>('localhost').use(noop)

expectTypeOf((await withNoop.todos.get()).data).toEqualTypeOf<Todo[] | null>()

// @ts-expect-error no verb was declared, so none is contributed
withNoop.todos.live

// @ts-expect-error ...and the node is not an index signature
withNoop.todos.anything

// ! the ordinary Treaty surface is untouched by an inferred plugin
expectTypeOf(withInferred.todos.post).toBeCallableWith({ text: 'a' })
expectTypeOf((await withInferred.todos.get()).data).toEqualTypeOf<
	Todo[] | null
>()
expectTypeOf(withInferred.todos['~path']).toEqualTypeOf<string>()

// ? and it folds alongside a hand-written one
expectTypeOf(withInferred.use(cache).todos.cached).toEqualTypeOf<
	() => CacheHandle<Todo>
>()
expectTypeOf(withInferred.use(cache).todos.live).toEqualTypeOf<
	(options?: { query?: { list?: string } }) => LiveHandle<Todo[]>
>()

// ? an `as const` verbs record does not leak `readonly` onto the client
const frozen = createPlugin({
	name: 'frozen',
	verbs: {
		ping(context) {
			return context.path
		}
	} as const
})

const withFrozen = treaty<App>('localhost').use(frozen)

expectTypeOf<Pick<typeof withFrozen.todos, 'ping'>>().toEqualTypeOf<{
	ping: () => string
}>()
