import type {
    Elysia,
    SCHEMA,
    TypedRoute,
    IsPathParameter,
    EXPOSED
} from 'elysia'
import type { TObject } from '@sinclair/typebox'

import type { EdenWS } from '.'
import { type EdenFetchError, type Signal } from './utils'

type IsAny<T> = unknown extends T
    ? [T] extends [object]
        ? true
        : false
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

type CreateEdenFn<Exposed extends Record<string, any>> = EdenFn<Exposed> & {
    $set(config: EdenConfig): void
    $clone(config?: EdenConfig): CreateEdenFn<Exposed>
}

export type Eden<App extends Elysia<any>> = App['meta'] extends {
    [key in typeof SCHEMA]: infer Schema extends Record<
        string,
        Record<string, TypedRoute>
    >
}
    ? UnionToIntersection<CreateEden<Schema>> & {
          $fn: CreateEdenFn<App['meta'][typeof EXPOSED]>
      }
    : 'Please install Elysia before using Eden'

export interface EdenCall {
    [x: string]: any
    $fetch?: RequestInit
    $query?: Record<string, string | boolean | number>
}

export type UnionToIntersection<U> = (
    U extends any ? (k: U) => void : never
) extends (k: infer I) => void
    ? I
    : never

// https://twitter.com/mattpocockuk/status/1622730173446557697?s=20
type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

type TypedRouteToParams<Route extends TypedRoute> =
    (Route['body'] extends NonNullable<Route['body']>
        ? Route['body'] extends Record<any, any>
            ? Route['body']
            : {
                  $body: Route['body']
              }
        : {}) &
        (Route['query'] extends NonNullable<Route['query']>
            ? unknown extends Route['query']
                ? {}
                : {
                      $query: Route['query']
                  }
            : {})

export type CreateEden<
    Server extends Record<string, Record<string, TypedRoute>>,
    // pathnames are always string
    Path extends string = keyof Server extends string ? keyof Server : never,
    Full extends string = ''
> = Path extends `/${infer Start}`
    ? CreateEden<Server, Start, Path>
    : Path extends `${infer A}/${infer B}`
    ? // If path parameters, accept any string
      IsPathParameter<A> extends never
        ? {
              [key in A]: CreateEden<Server, B, Full>
          }
        : Record<string, CreateEden<Server, B, Full>> &
              Record<
                  `$${A}`,
                  `Expected path parameters ':${A}', replace this with any string`
              >
    : // Iterate until last string then catch method
      {
          [key in Path extends ''
              ? // If end with empty, then return as index
                'index'
              : Path extends `:${infer params}`
              ? string
              : Path | CamelCase<Path>]: Full extends keyof Server
              ? {
                    // Check if is method
                    [key in keyof Server[Full] extends string
                        ? Lowercase<keyof Server[Full]>
                        : keyof Server[Full]]: [
                        Server[Full][key extends string ? Uppercase<key> : key]
                    ] extends [infer Route extends TypedRoute]
                        ? undefined extends Route['body']
                            ? (params?: {
                                  $query?: EdenCall['$query']
                                  $fetch?: EdenCall['$fetch']
                              }) => Promise<
                                  Route['response'] extends {
                                      200: infer ReturnedType
                                  }
                                      ?
                                            | ReturnedType
                                            | MapError<Route['response']>
                                      : unknown
                              >
                            : (
                                  params: Prettify<
                                      TypedRouteToParams<Route> & {
                                          $query?: EdenCall['$query']
                                          $fetch?: EdenCall['$fetch']
                                      }
                                  >
                              ) => Promise<
                                  Route['response'] extends {
                                      200: infer ReturnedType
                                  }
                                      ?
                                            | ReturnedType
                                            | MapError<Route['response']>
                                      : unknown
                              >
                        : key extends 'subscribe'
                        ? // Since subscribe key is only a lower letter
                          [
                              Server[Full][key],
                              Server[Full][key]['query']
                          ] extends [
                              infer Route extends TypedRoute,
                              infer Query extends TypedRoute['query']
                          ]
                            ? unknown extends NonNullable<Query>
                                ? (params?: {
                                      $query?: EdenCall['$query']
                                  }) => EdenWS<Route>
                                : Query extends NonNullable<Query>
                                ? (params: { $query: Query }) => EdenWS<Route>
                                : (params?: {
                                      $query?: EdenCall['$query']
                                  }) => EdenWS<Route>
                            : never
                        : never
                }
              : never
      } & (Path extends `:${infer params}`
          ? Record<
                `$${params}`,
                `Expected path parameters ':${params}', replace this with any string`
            >
          : {})

// https://stackoverflow.com/questions/59623524/typescript-how-to-map-type-keys-to-camelcase
type CamelCase<S extends string> =
    S extends `${infer P1}-${infer P2}${infer P3}`
        ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
        : Lowercase<S>

export interface EdenWSOnMessage<Data = unknown> extends MessageEvent {
    data: Data
    rawData: MessageEvent['data']
}

export type EdenWSEvent<
    K extends keyof WebSocketEventMap,
    Data = unknown
> = K extends 'message' ? EdenWSOnMessage<Data> : WebSocketEventMap[K]

export interface EdenConfig {
    fn?: string
    fetch?: Omit<RequestInit, 'body'>
}

type Enumerate<
    N extends number,
    Acc extends number[] = []
> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

// https://stackoverflow.com/a/39495173
type Range<F extends number, T extends number> = Exclude<
    Enumerate<T>,
    Enumerate<F>
>

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
