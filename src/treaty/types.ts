import type { Elysia, AnyTypedSchema } from 'elysia'

import type { EdenWS } from './index'
import type { IsNever, IsUnknown, MapError, UnionToIntersect } from '../types'
import { EdenFetchError } from '../utils'

type Replace<RecordType, TargetType, GenericType> = {
    [K in keyof RecordType]: RecordType[K] extends TargetType
        ? GenericType
        : RecordType[K]
}

// @ts-ignore
type Files = File | FileList

export namespace EdenTreaty {
    export type Create<App extends Elysia<any, any>> = App['meta'] extends {
        schema: infer Schema extends Record<string, any>
    }
        ? EdenTreaty.Sign<Schema>
        : 'Please install Elysia before using Eden'

    export interface Config {
        /**
         * Default options to pass to fetch
         */
        $fetch?: FetchRequestInit
        fetcher?: typeof fetch
    }

    export type Sign<A> = {
        [Path in keyof A as Path extends `/${infer Prefix}/${string}`
            ? Prefix
            : Path extends `/`
            ? 'index'
            : Path extends `/${infer Prefix}`
            ? Prefix
            : never]: UnionToIntersect<
            Path extends `/${string}/${infer Rest}`
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
                                  : ((
                                        params: (IsUnknown<
                                            Route['body']
                                        > extends false
                                            ? Replace<
                                                  Route['body'],
                                                  Blob | Blob[],
                                                  Files
                                              >
                                            : {}) &
                                            (undefined extends Route['query']
                                                ? {
                                                      $query?: Record<
                                                          string,
                                                          string
                                                      >
                                                  }
                                                : {
                                                      $query: Route['query']
                                                  }) &
                                            (undefined extends Route['headers']
                                                ? {
                                                      $headers?: Record<
                                                          string,
                                                          unknown
                                                      >
                                                  }
                                                : {
                                                      $headers: Route['headers']
                                                  }) &
                                            (IsUnknown<
                                                Route['params']
                                            > extends false
                                                ? {
                                                      $params?: never
                                                  }
                                                : {
                                                      $params: Route['params']
                                                  })
                                    ) => Promise<
                                        | {
                                              data: Route['response'] extends {
                                                  200: infer ReturnedType
                                              }
                                                  ? Awaited<ReturnedType>
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
                                    >) extends (
                                        params: infer Params
                                    ) => infer Response
                                  ? {
                                        $params: undefined
                                        $headers: undefined
                                        $query: undefined
                                    } extends Params
                                      ? (params?: Params) => Response
                                      : (params: Params) => Response
                                  : never
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
                              : ((
                                    params: (IsUnknown<
                                        Route['body']
                                    > extends false
                                        ? Replace<
                                              Route['body'],
                                              Blob | Blob[],
                                              Files
                                          >
                                        : {}) &
                                        (undefined extends Route['query']
                                            ? {
                                                  $query?: Record<
                                                      string,
                                                      string
                                                  >
                                              }
                                            : {
                                                  $query: Route['query']
                                              }) &
                                        (undefined extends Route['headers']
                                            ? {
                                                  $headers?: Record<
                                                      string,
                                                      unknown
                                                  >
                                              }
                                            : {
                                                  $headers: Route['headers']
                                              }) &
                                        (IsUnknown<
                                            Route['params']
                                        > extends false
                                            ? {
                                                  $params?: never
                                              }
                                            : {
                                                  $params: Route['params']
                                              })
                                ) => Promise<
                                    | {
                                          data: Route['response'] extends {
                                              200: infer ReturnedType
                                          }
                                              ? Awaited<ReturnedType>
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
                                >) extends (
                                    params: infer Params
                                ) => infer Response
                              ? {
                                    $params: undefined
                                    $headers: undefined
                                    $query: undefined
                                } extends Params
                                  ? (params?: Params) => Response
                                  : (params: Params) => Response
                              : never
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
    : T extends `:${string}`
    ? Record<(string & {}) | number | T, V>
    : Record<T, V>
