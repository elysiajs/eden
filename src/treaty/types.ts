import type { Elysia, SCHEMA, AnyTypedSchema } from 'elysia'

import type { EdenWS } from './index'
import type { IsNever, IsUnknown, MapError, UnionToIntersect } from '../types'
import { EdenFetchError } from '../utils'

type Replace<RecordType, TargetType, GenericType> = {
    [K in keyof RecordType]: RecordType[K] extends TargetType
        ? GenericType
        : RecordType[K]
}

export namespace EdenTreaty {
    export type Create<App extends Elysia<any>> = App['meta'] extends Record<
        typeof SCHEMA,
        infer Schema extends Record<string, any>
    >
        ? EdenTreaty.Sign<Schema>
        : 'Please install Elysia before using Eden'

    export interface Config {}

    export type Sign<A> = {
        [Path in keyof A as Path extends `/${infer Prefix}/${infer _}`
            ? Prefix
            : Path extends `/`
            ? 'index'
            : Path extends `/${infer Prefix}`
            ? Prefix
            : never]: UnionToIntersect<
            Path extends `/${infer _}/${infer Rest}`
                ? NestPath<
                      Rest,
                      {
                          [Method in keyof A[Path]]: A[Path][Method] extends infer Route extends AnyTypedSchema
                              ? Method extends 'subscribe'
                                  ? undefined extends Route['query']
                                      ? (params?: {
                                            $query?: Record<string, string>
                                        }) => EdenWS<Route>
                                      : (params: {
                                            $query: Route['query']
                                        }) => EdenWS<Route>
                                  : IsUnknown<Route['body']> extends true
                                  ? undefined extends Route['query']
                                      ? (params?: {
                                            $query?: Record<string, string>
                                            $fetch?: RequestInit
                                        }) => Promise<
                                            | {
                                                  data: Awaited<Route['response']['200']>
                                                  error: null
                                              }
                                            | {
                                                  data: null
                                                  error: MapError<
                                                      Route['response']
                                                  > extends infer Errors
                                                      ? IsNever<Errors> extends true
                                                          ? EdenFetchError<
                                                                number,
                                                                string
                                                            >
                                                          : Errors
                                                      : EdenFetchError<
                                                            number,
                                                            string
                                                        >
                                              }
                                        >
                                      : (params: {
                                            $query: Route['query']
                                            $fetch?: RequestInit
                                        }) => Promise<
                                            | {
                                                  data: Awaited<Route['response']['200']>
                                                  error: null
                                              }
                                            | {
                                                  data: null
                                                  error: MapError<
                                                      Route['response']
                                                  > extends infer Errors
                                                      ? IsNever<Errors> extends true
                                                          ? EdenFetchError<
                                                                number,
                                                                string
                                                            >
                                                          : Errors
                                                      : EdenFetchError<
                                                            number,
                                                            string
                                                        >
                                              }
                                        >
                                  : (
                                        params: Replace<
                                            Route['body'],
                                            Blob | Blob[],
                                            File | FileList
                                        > & {
                                            $query?: Record<string, string>
                                            $fetch?: RequestInit
                                        }
                                    ) => Promise<
                                        | {
                                              data: Route['response'] extends {
                                                  200: infer ReturnedType
                                              }
                                                  ? ReturnedType
                                                  : unknown
                                              error: null
                                          }
                                        | {
                                              data: null
                                              error: MapError<
                                                  Route['response']
                                              > extends infer Errors
                                                  ? IsNever<Errors> extends true
                                                      ? EdenFetchError<
                                                            number,
                                                            string
                                                        >
                                                      : Errors
                                                  : EdenFetchError<
                                                        number,
                                                        string
                                                    >
                                          }
                                    >
                              : never
                      }
                  >
                : {
                      [Method in keyof A[Path]]: A[Path][Method] extends infer Route extends AnyTypedSchema
                          ? Method extends 'subscribe'
                              ? undefined extends Route['query']
                                  ? (params?: {
                                        $query?: Record<string, string>
                                    }) => EdenWS<Route>
                                  : (params: {
                                        $query: Route['query']
                                    }) => EdenWS<Route>
                              : IsUnknown<Route['body']> extends true
                              ? undefined extends Route['query']
                                  ? (params?: {
                                        $query?: Record<string, string>
                                        $fetch?: RequestInit
                                    }) => Promise<
                                        | {
                                              data: Awaited<Route['response']['200']>
                                              error: null
                                          }
                                        | {
                                              data: null
                                              error: MapError<
                                                  Route['response']
                                              > extends infer Errors
                                                  ? IsNever<Errors> extends true
                                                      ? EdenFetchError<
                                                            number,
                                                            string
                                                        >
                                                      : Errors
                                                  : EdenFetchError<
                                                        number,
                                                        string
                                                    >
                                          }
                                    >
                                  : (params: {
                                        $query: Route['query']
                                        $fetch?: RequestInit
                                    }) => Promise<
                                        | {
                                              data: Awaited<Route['response']['200']>
                                              error: null
                                          }
                                        | {
                                              data: null
                                              error: MapError<
                                                  Route['response']
                                              > extends infer Errors
                                                  ? IsNever<Errors> extends true
                                                      ? EdenFetchError<
                                                            number,
                                                            string
                                                        >
                                                      : Errors
                                                  : EdenFetchError<
                                                        number,
                                                        string
                                                    >
                                          }
                                    >
                              : (
                                    params: Replace<
                                        Route['body'],
                                        Blob | Blob[],
                                        File | FileList
                                    > & {
                                        $query?: Record<string, string>
                                        $fetch?: RequestInit
                                    }
                                ) => Promise<
                                    | {
                                          data: Route['response'] extends {
                                              200: infer ReturnedType
                                          }
                                              ? ReturnedType
                                              : unknown
                                          error: null
                                      }
                                    | {
                                          data: null
                                          error: MapError<
                                              Route['response']
                                          > extends infer Errors
                                              ? IsNever<Errors> extends true
                                                  ? EdenFetchError<
                                                        number,
                                                        string
                                                    >
                                                  : Errors
                                              : EdenFetchError<number, string>
                                      }
                                >
                          : never
                  }
        >
    }

    export interface OnMessage<Data = unknown> extends MessageEvent {
        data: Data
        rawData: MessageEvent['data']
    }

    export type WSEvent<
        K extends keyof WebSocketEventMap,
        Data = unknown
    > = K extends 'message' ? OnMessage<Data> : WebSocketEventMap[K]

    export interface CallOption {
        [x: string]: any
        $fetch?: RequestInit
        $query?: Record<string, string>
    }
}

type NestPath<T extends string, V> = T extends `${infer First}/${infer Rest}`
    ? First extends `:${infer Parameter}`
        ? Record<(string & {}) | number | `:${Parameter}`, NestPath<Rest, V>>
        : Record<First, NestPath<Rest, V>>
    : T extends `:${infer Parameter}`
    ? Record<(string & {}) | number | T, V>
    : Record<T, V>
