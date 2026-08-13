import type { Elysia } from 'elysia'

import type { Treaty } from './types'

export interface PluginTypeFn {
    node: unknown

    /**
     * The client-level `Head` record from `treaty`'s `Head` generic, ie. the
     * headers prebound on the client. A verb mirroring a route's call shape
     * needs it to omit or relax the headers Treaty already supplies.
     */
    head: unknown
    output: unknown
}

/**
 * Apply a single type fn to a node.
 *
 * `never` is assignable to everything, so an unguarded `never` would match a
 * plugin's live branch and leak a verb with `unknown` payloads:
 * - `Node` is `never` when a route node is absent
 * - `F` is `never` when {@link ExtractPluginTypeFn} cannot recover a type fn
 *   (an unannotated plugin object), which would otherwise collapse the whole
 *   route node to `never`
 */
export type ApplyPluginTypeFn<F extends PluginTypeFn, Node, Head> = [
    F
] extends [never]
    ? {}
    : [Node] extends [never]
      ? {}
      : (F & { node: Node; head: Head })['output']

/** Fold a tuple of type fns over a node, intersecting each result. */
export type ApplyPlugins<Fns extends PluginTypeFn[], Node, Head> = Fns extends [
    infer F extends PluginTypeFn,
    ...infer Rest extends PluginTypeFn[]
]
    ? ApplyPluginTypeFn<F, Node, Head> & ApplyPlugins<Rest, Node, Head>
    : {}

export type ExtractPluginTypeFn<P> = P extends { '~fn'?: infer F }
    ? NonNullable<F> extends PluginTypeFn
        ? NonNullable<F>
        : never
    : never

export interface PluginVerbContext {
    /** route path the verb was called on, eg. '/todos' */
    path: string
    /** path segments, eg. ['todos'] */
    paths: string[]
    domain: string
    config: Treaty.Config
    elysia?: Elysia<any, any, any, any, any, any>
}

/**
 * A Treaty client plugin.
 *
 * ! Dispatching a verb deliberately bypasses Treaty's request pipeline — no
 * ! query serialization, header processing, `onRequest` / `onResponse` or
 * ! response parsing runs. A plugin owns its own wire path.
 */
export interface TreatyPlugin<Fn extends PluginTypeFn = never> {
    name: string
    /** phantom type carrier */
    '~fn'?: Fn
    /**
     * ! Keys MUST match the keys `Fn` contributes. The contract is not
     * ! statically enforceable, as `Fn`'s output keys are conditional on the
     * ! route node; a typed verb with no runtime entry silently falls through
     * ! to an ordinary HTTP request named after the verb.
     *
     * ! Reserved: Treaty's 9 built-in methods and the names the proxy owns
     * ! (`use`, `~path`, `then`, `catch`, `finally`) throw on registration.
     * ! Exotic http methods (`TRACE`, `PROPFIND`, any custom token) and route
     * ! segments sharing a verb name are shadowed by the plugin, by design.
     */
    verbs: Record<
        string,
        (context: PluginVerbContext, ...args: any[]) => unknown
    >
}
