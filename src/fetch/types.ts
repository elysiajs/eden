import type { Elysia, SCHEMA } from 'elysia'
import type { EdenFetchError } from '../utils'
import type { MapError, IsUnknown, IsNever, AnyTypedRoute } from '../types'

export namespace EdenFetch {
    export type Create<App extends Elysia<any>> = App['meta'] extends Record<
        typeof SCHEMA,
        infer Schema extends Record<string, any>
    >
        ? EdenFetch.Fn<Schema>
        : 'Please install Elysia before using Eden'

    export interface Config {}

    export type Fn<Schema extends Record<string, any>> = <
        Endpoint extends keyof Schema,
        Method extends Extract<keyof Schema[Endpoint], string>,
        Route extends Schema[Endpoint][Method]
    >(
        endpoint: Endpoint,
        options: Omit<RequestInit, 'body' | 'method' | 'headers'> &
            ('get' extends Method
                ? {
                      method?: Uppercase<Method>
                  }
                : {
                      method: Uppercase<Method>
                  }) &
            (IsNever<keyof Route['params']> extends true
                ? {
                      params?: Record<never, string>
                  }
                : {
                      params: Route['params']
                  }) &
            (undefined extends Route['headers']
                ? {
                      headers?: Record<string, string>
                  }
                : {
                      headers: Route['headers']
                  }) &
            (IsUnknown<Route['body']> extends false
                ? { body: Route['body'] }
                : { body?: unknown })
    ) => Promise<
        | {
              data: Awaited<Route['response']['200']>
              error: null
          }
        | {
              data: null
              error: MapError<Route['response']> extends infer Errors
                  ? IsNever<Errors> extends true
                      ? EdenFetchError<number, string>
                      : Errors
                  : EdenFetchError<number, string>
          }
    >
}
