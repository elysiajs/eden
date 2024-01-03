import type { Elysia } from 'elysia'
import type { EdenFetchError } from '../errors'
import type { MapError, IsUnknown, IsNever } from '../types'

type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

export namespace EdenFetch {
    export type Create<App extends Elysia<any, any, any, any, any, any>> =
        App extends {
            schema: infer Schema extends Record<string, any>
        }
            ? EdenFetch.Fn<Schema>
            : 'Please install Elysia before using Eden'

    export interface Config {
        fetcher?: typeof globalThis.fetch
    }

    export type Fn<Schema extends Record<string, any>> = <
        Endpoint extends keyof Schema,
        Method extends Uppercase<Extract<keyof Schema[Endpoint], string>>,
        Route extends Schema[Endpoint][Lowercase<Method>]
    >(
        endpoint: Endpoint,
        options: Omit<RequestInit, 'body' | 'method' | 'headers'> &
            ('GET' extends Method
                ? {
                      method?: Method
                  }
                : {
                      method: Method
                  }) &
            (IsNever<Route['params']> extends true
                ? {
                      params?: Record<never, string>
                  }
                : {
                      params: Route['params']
                  }) &
            (IsNever<keyof Route['query']> extends true
                ? {
                      query?: Record<never, string>
                  }
                : {
                      query: Route['query']
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
        Prettify<
            (
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
            ) & {
                status: number
                response: Response
                headers: Record<string, string>
            }
        >
    >
}
