import type {
    Elysia,
    SCHEMA,
    IsPathParameter,
    EXPOSED,
    AnyTypedSchema
} from 'elysia'

import { type EdenFetchError } from './utils'

export interface EdenConfig {
    fn?: string
    fetch?: Omit<RequestInit, 'body'>
}

type CreateEdenFn<Exposed extends Record<string, any>> = EdenFn<Exposed> & {
    $set(config: EdenConfig): void
    $clone(config?: EdenConfig): CreateEdenFn<Exposed>
}

export type Eden<App extends Elysia<any>> = App['meta'] extends {
    [key in typeof SCHEMA]: infer Schema extends Record<
        string,
        Record<string, AnyTypedRoute>
    >
}
    ? {
          fn: CreateEdenFn<App['meta'][typeof EXPOSED]>
          fetch: <
              Endpoint extends keyof Schema,
              Method extends keyof Schema[Endpoint],
              Route extends Schema[Endpoint][Method]
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
                  (IsNever<keyof Route['params']> extends true
                      ? {
                            params?: Record<never, string>
                        }
                      : {
                            params: Route['params']
                        }) &
                  (undefined extends Route['headers']
                      ? {
                            headers?: Route['headers']
                        }
                      : {
                            headers: Route['headers']
                        }) &
                  (IsUnknown<Route['body']> extends false
                      ? { body: Route['body'] }
                      : { body?: unknown })
          ) =>
              | Promise<Route['response']['200']>
              | (MapError<Route['response']> extends infer Errors
                    ? IsNever<Errors> extends true
                        ? EdenFetchError<number, string>
                        : Errors
                    : never)
      }
    : 'Please install Elysia before using Eden'

export type IsNever<T> = [T] extends [never] ? true : false

// https://stackoverflow.com/a/39495173
type Range<F extends number, T extends number> = Exclude<
    Enumerate<T>,
    Enumerate<F>
>

type Enumerate<
    N extends number,
    Acc extends number[] = []
> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

type ErrorRange = Range<300, 599>

type MapError<T extends Record<number, unknown>> = [
    {
        [K in keyof T]-?: K extends ErrorRange ? K : never
    }[keyof T]
] extends [infer A extends number]
    ? {
          [K in A]: EdenFetchError<K, T[K]>
      }[A]
    : false

export type IsAny<T> = 0 extends 1 & T ? true : false

export type IsUnknown<T> = IsAny<T> extends true
    ? false
    : unknown extends T
    ? true
    : false

type Promisify<T extends (...args: any[]) => any> = T extends (
    ...args: infer Args
) => infer Return
    ? Return extends Promise<any>
        ? T
        : (...args: Args) => Promise<Return>
    : never

type Asynctify<T> = T extends infer Fn extends (...args: any) => any
    ? Promisify<Fn>
    : T extends Record<string, any>
    ? {
          [K in keyof T]: EdenFn<T[K]>
      }
    : never

type EdenFn<T> = T extends {
    [EXPOSED]: any
    value: infer Value
}
    ? Asynctify<Value>
    : Asynctify<T>

export type AnyTypedRoute = {
    body: unknown
    headers: Record<string, any> | undefined
    query: Record<string, any> | undefined
    params: Record<string, any> | undefined
    response: Record<string, unknown> & {
        '200': unknown
    }
}
