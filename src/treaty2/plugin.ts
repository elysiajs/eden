import type { Elysia } from 'elysia'

import type { EdenFetchError } from '../errors'
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

    /**
     * Extra per-call options, merged into the option parameter of the mutation
     * verbs — the same verbs {@link TreatyPlugin.onBeforeCall} observes.
     *
     * `output` cannot carry these: it merges members onto the route node,
     * while a verb's options are built separately from the node's methods.
     *
     * Optional: a type fn declared structurally against an older Eden has no
     * such member, and an absent one contributes nothing to the fold.
     */
    callOptions?: unknown
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
 * - `Key` is absent when the type fn predates it ({@link PluginTypeFn.callOptions})
 */
export type ApplyPluginTypeFn<
    F extends PluginTypeFn,
    Node,
    Head,
    Key extends 'output' | 'callOptions' = 'output'
> = [F] extends [never]
    ? {}
    : [Node] extends [never]
      ? {}
      : Key extends keyof F
        ? (F & { node: Node; head: Head })[Key]
        : {}

/** Fold a tuple of type fns over a node, intersecting each result. */
export type ApplyPlugins<
    Fns extends PluginTypeFn[],
    Node,
    Head,
    Key extends 'output' | 'callOptions' = 'output'
> = Fns extends [
    infer F extends PluginTypeFn,
    ...infer Rest extends PluginTypeFn[]
]
    ? ApplyPluginTypeFn<F, Node, Head, Key> &
          ApplyPlugins<Rest, Node, Head, Key>
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

/** A mutation call, as seen before it is sent. */
export interface PluginCallContext {
    paths: string[]
    /** the verb, lowercased: `post`, `put`, `patch` or `delete` */
    method: string
    /** the call's option argument, by reference */
    options: Record<string, any> | undefined
    /** the same object identity {@link PluginVerbContext.config} carries */
    config: Treaty.Config
    domain: string
}

/** The value a mutation call resolves to, or throws when `throwHttpError`. */
export interface PluginCallResult {
    data: unknown
    error: EdenFetchError<number, unknown> | null
    /** `undefined` when the request never reached the server */
    response: Response | undefined
    status: number
    headers: Headers | undefined
}

export type OnBeforeCall = (context: PluginCallContext) => void
export type OnAfterCall = (
    result: PluginCallResult,
    context: PluginCallContext
) => void

export interface TreatyPlugin<Fn extends PluginTypeFn = never> {
    name: string
    /** phantom type carrier */
    '~fn'?: Fn

    verbs?: Record<
        string,
        (context: PluginVerbContext, ...args: any[]) => unknown
	>

    before?: OnBeforeCall
    after?: OnAfterCall
}
