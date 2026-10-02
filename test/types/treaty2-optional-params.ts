import { Elysia, t } from 'elysia'
import { treaty } from '../../src'
import { expectTypeOf } from 'expect-type'

type Data<T> = T extends (...args: any[]) => Promise<infer R>
    ? R extends { data: infer D; error: null }
        ? D
        : never
    : never

// A required `:id` and an optional `:id?` on one node are the same call.
// Indexing the node with both keys gave a union of their subtrees, so neither
// `users({ id }).posts` nor `users.maybe` resolved
{
    const app = new Elysia().use(
        new Elysia({ prefix: '/users' })
            .get('/:id/posts', () => 'posts' as const)
            .get('/:id?/maybe', () => 'maybe' as const)
    )
    const api = treaty<typeof app>('localhost:3000')

    const posts = api.users({ id: 1 }).posts.get
    expectTypeOf<Data<typeof posts>>().toEqualTypeOf<'posts'>()

    const maybe = api.users({ id: 1 }).maybe.get
    expectTypeOf<Data<typeof maybe>>().toEqualTypeOf<'maybe'>()

    expectTypeOf<Parameters<typeof api.users>[0]>().toEqualTypeOf<{
        id: string | number
    }>()

    // the optional param can be left out: /users/maybe is served
    expectTypeOf<Data<typeof api.users.maybe.get>>().toEqualTypeOf<'maybe'>()

    // @ts-expect-error /users/posts is not served, `:id` is required there
    api.users.posts
}

// The same holds when the optional param is the last segment, for HTTP and
// WebSocket routes alike
{
    const app = new Elysia()
        .get('/items/:id', () => 'get' as const)
        .delete('/items/:id?', () => 'delete' as const)
        .get('/chat/:room', () => 'history' as const)
        .ws('/chat/:room?', { body: t.String(), message() {} })
    const api = treaty<typeof app>('localhost:3000')

    const get = api.items({ id: 1 }).get
    expectTypeOf<Data<typeof get>>().toEqualTypeOf<'get'>()

    const remove = api.items({ id: 1 }).delete
    expectTypeOf<Data<typeof remove>>().toEqualTypeOf<'delete'>()

    expectTypeOf<Data<typeof api.items.delete>>().toEqualTypeOf<'delete'>()

    // @ts-expect-error GET /items is not served
    api.items.get

    const history = api.chat({ room: 'a' }).get
    expectTypeOf<Data<typeof history>>().toEqualTypeOf<'history'>()

    api.chat({ room: 'a' }).subscribe().send('hi')
    api.chat.subscribe().send('hi')

    // @ts-expect-error GET /chat is not served
    api.chat.get
}

// An optional param alone on its node keeps expanding as before, including
// under an optional prefix whose routes start with a param and a literal
{
    const app = new Elysia()
        .get('/users/:org?/:id', () => 'user' as const)
        .get('/x/:a?/:b?/y', () => 'y' as const)
    const api = treaty<typeof app>('localhost:3000')

    const withOrg = api.users({ org: 'elysia' })({ id: 1 }).get
    expectTypeOf<Data<typeof withOrg>>().toEqualTypeOf<'user'>()

    const withoutOrg = api.users({ id: 1 }).get
    expectTypeOf<Data<typeof withoutOrg>>().toEqualTypeOf<'user'>()

    api.x.y.get()
    api.x({ a: 1 })({ b: 2 }).y.get()

    const prefixed = new Elysia({ prefix: '/:lang?' })
        .get('/:id', () => 'id' as const)
        .get('/home', () => 'home' as const)
    const lang = treaty<typeof prefixed>('localhost:3000')

    const id = lang({ lang: 'en' })({ id: 1 }).get
    expectTypeOf<Data<typeof id>>().toEqualTypeOf<'id'>()

    const home = lang({ lang: 'en' }).home.get
    expectTypeOf<Data<typeof home>>().toEqualTypeOf<'home'>()

    expectTypeOf<Data<typeof lang.home.get>>().toEqualTypeOf<'home'>()
}

// A route both subtrees define can't be called on the param URL: the runtime
// serves whichever was registered last, which the types can't tell, so any
// body or query would be a guess. The param-less URL is only served by the
// optional route and keeps its types. Both registration orders behave alike
{
    const requiredFirst = new Elysia()
        .post(
            '/users/:id/x',
            { body: t.Object({ a: t.String() }) },
            () => 'A' as const
        )
        .get('/users/:id/x', () => 'get' as const)
        .post(
            '/users/:id?/x',
            { body: t.Object({ b: t.Number() }) },
            () => 'B' as const
        )
    const optionalFirst = new Elysia()
        .post(
            '/users/:id?/x',
            { body: t.Object({ b: t.Number() }) },
            () => 'B' as const
        )
        .post(
            '/users/:id/x',
            { body: t.Object({ a: t.String() }) },
            () => 'A' as const
        )
        .get('/users/:id/x', () => 'get' as const)

    const a = treaty<typeof requiredFirst>('localhost:3000')
    const b = treaty<typeof optionalFirst>('localhost:3000')

    // @ts-expect-error POST /users/1/x is served by the later registration
    a.users({ id: 1 }).x.post({ a: 'a' })
    // @ts-expect-error POST /users/1/x is served by the later registration
    a.users({ id: 1 }).x.post({ b: 1 })
    // @ts-expect-error POST /users/1/x is served by the later registration
    b.users({ id: 1 }).x.post({ a: 'a' })
    // @ts-expect-error POST /users/1/x is served by the later registration
    b.users({ id: 1 }).x.post({ b: 1 })
    // @ts-expect-error neither route takes both bodies
    a.users({ id: 1 }).x.post({ a: 'a', b: 1 })

    // a verb only one subtree defines still merges
    const get = a.users({ id: 1 }).x.get
    expectTypeOf<Data<typeof get>>().toEqualTypeOf<'get'>()

    expectTypeOf<Data<typeof a.users.x.post>>().toEqualTypeOf<'B'>()
    expectTypeOf<Data<typeof b.users.x.post>>().toEqualTypeOf<'B'>()
    // @ts-expect-error /users/x is only served by the optional route
    a.users.x.post({ a: 'a' })

    const wsRequiredFirst = new Elysia()
        .ws('/chat/:room', {
            body: t.String(),
            query: t.Object({ a: t.String() }),
            message() {}
        })
        .ws('/chat/:room?', {
            body: t.Number(),
            query: t.Object({ b: t.String() }),
            message() {}
        })
    const wsOptionalFirst = new Elysia()
        .ws('/chat/:room?', {
            body: t.Number(),
            query: t.Object({ b: t.String() }),
            message() {}
        })
        .ws('/chat/:room', {
            body: t.String(),
            query: t.Object({ a: t.String() }),
            message() {}
        })

    const c = treaty<typeof wsRequiredFirst>('localhost:3000').chat
    const d = treaty<typeof wsOptionalFirst>('localhost:3000').chat

    // @ts-expect-error /chat/a is served by the later registration
    c({ room: 'a' }).subscribe({ query: { a: 'a' } })
    // @ts-expect-error /chat/a is served by the later registration
    c({ room: 'a' }).subscribe({ query: { b: 'b' } })
    // @ts-expect-error /chat/a is served by the later registration
    d({ room: 'a' }).subscribe({ query: { a: 'a' } })
    // @ts-expect-error /chat/a is served by the later registration
    d({ room: 'a' }).subscribe({ query: { b: 'b' } })
    // @ts-expect-error neither route takes both queries
    c({ room: 'a' }).subscribe({ query: { a: 'a', b: 'b' } })

    c.subscribe({ query: { b: 'b' } }).send(1)
    d.subscribe({ query: { b: 'b' } }).send(1)
    // @ts-expect-error /chat is only served by the optional route
    c.subscribe({ query: { b: 'b' } }).send('x')
    // @ts-expect-error /chat is only served by the optional route
    d.subscribe({ query: { a: 'a' } })
}

// The merge is limited to what every call it types is served by. Any other
// node with both kinds of param stays uncallable, as it was:
// - different names, which the client would send as one terminal request
// - a param or wildcard below, which a static sibling can win against
// - a param-less path that another route also matches: `/users/me` is
//   `/users/:id` with `id = me`, `/users/a/b` is `/users/:id?/b` with
//   `id = a`, and `/users/x` registered directly is the same route twice
// - a key the runtime reads differently: `.method('POST')` is `.post()`,
//   `café` is also registered as `caf%C3%A9`, a `/k/` prefix joins `/x`
//   into `/k/x` while it is typed `k[''].x`, and `:user-id?` is not \w+, so
//   the router keeps it a required param
{
    const app = new Elysia()
        .get('/a/:id/x', () => 'x' as const)
        .get('/a/:org?/y', () => 'y' as const)
        .get('/b/:id/fixed/a', () => 'fixed' as const)
        .get('/b/:id?/:slug/a', () => 'slug' as const)
        .get('/c/:id?/:slug', () => 'slug' as const)
        .get('/c/:id/:tail?', () => 'tail' as const)
        .get('/d/:id/x/:p/a', () => 'a' as const)
        .get('/d/:id?/x/:p/b', () => 'b' as const)
        .get('/e/:id', () => 'id' as const)
        .get('/e/:id?/me', () => 'me' as const)
        .get('/f/:id/x', () => 'x' as const)
        .get('/f/:id?/a/b', () => 'ab' as const)
        .get('/f/:id?/b', () => 'b' as const)
        .get('/g/x', () => 'literal' as const)
        .get('/g/:id?/x', () => 'optional' as const)
        .get('/g/:id/y', () => 'y' as const)
        .get('/h/:a/x', () => 'ax' as const)
        .get('/h/:b/x', () => 'bx' as const)
        .get('/h/:a?/y', () => 'ay' as const)
        .get('/h/:b?/y', () => 'by' as const)
        .post(
            '/i/:id/x',
            { body: t.Object({ a: t.String() }) },
            () => 'A' as const
        )
        .method(
            'POST',
            '/i/:id?/x',
            { body: t.Object({ b: t.Number() }) },
            () => 'B' as const
        )
        .post(
            '/j/:id/café',
            { body: t.Object({ a: t.String() }) },
            () => 'A' as const
        )
        .post(
            '/j/:id?/caf%C3%A9',
            { body: t.Object({ b: t.Number() }) },
            () => 'B' as const
        )
        .use(new Elysia({ prefix: '/k/' }).get('/x', () => 'prefixed' as const))
        .get('/k/:id/y', () => 'y' as const)
        .get('/k/:id?/x', () => 'optional' as const)
        .get('/l/:user-id/y', () => 'y' as const)
        .get('/l/:user-id?/x', () => 'x' as const)
    const api = treaty<typeof app>('localhost:3000')

    // @ts-expect-error
    api.a({ id: 1, org: 'o' }).x.get()
    // @ts-expect-error
    api.a.y.get()
    // @ts-expect-error
    api.b({ id: 1 })({ slug: 'fixed' }).a.get()
    // @ts-expect-error
    api.b({ slug: 'x' }).a.get()
    // @ts-expect-error
    api.c({ slug: 'x' }).get()
    // @ts-expect-error
    api.c({ id: 1 }).get()
    // @ts-expect-error
    api.d({ id: 1 }).x({ p: 1 }).b.get()
    // @ts-expect-error
    api.e.me.get()
    // @ts-expect-error
    api.e({ id: 1 }).get()
    // @ts-expect-error
    api.f.a.b.get()
    // @ts-expect-error
    api.f({ id: 1 }).x.get()
    // @ts-expect-error
    api.g({ id: 1 }).y.get()
    // @ts-expect-error
    api.h({ a: 1, b: 2 }).x.get()
    // @ts-expect-error
    api.i({ id: 1 }).x.post({ a: 'a' })
    // @ts-expect-error
    api.i.x.POST({ b: 1 })
    // @ts-expect-error
    api.j({ id: 1 })['café'].post({ a: 'a' })
    // @ts-expect-error
    api.j['caf%C3%A9'].post({ b: 1 })
    // @ts-expect-error
    api.k.x.get()
    // @ts-expect-error
    api.l.x.get()

    // the node's own static routes stay reachable
    api.g.x.get()
}

// Keys are checked in steps, so a long segment neither hits the recursion
// limit nor hides a character the runtime reads differently
{
    const app = new Elysia()
        .get('/m/:id/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', () => 'long' as const)
        .get('/m/:id?/o', () => 'o' as const)
        .get('/n/:id/abcd%efghijk', () => 'n' as const)
        .get('/n/:id?/o', () => 'o' as const)
    const api = treaty<typeof app>('localhost:3000')

    expectTypeOf<Data<typeof api.m.o.get>>().toEqualTypeOf<'o'>()
    // @ts-expect-error `%` inside a step falls back
    api.n.o.get()
}
