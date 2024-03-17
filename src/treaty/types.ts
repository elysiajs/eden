/// <reference lib="dom" />
import type { Elysia } from 'elysia'
import type { EdenWS } from './index'
import type { IsUnknown, IsNever, UnionToIntersect, MapError } from '../types'
import type { EdenFetchError } from '../errors'

type Files = File | FileList

type Replace<RecordType, TargetType, GenericType> = {
    [K in keyof RecordType]: RecordType[K] extends TargetType
        ? GenericType
        : RecordType[K]
}

type Split<S extends string> = S extends `${infer Head}/${infer Tail}`
    ? Head extends ''
        ? Tail extends ''
            ? []
            : Split<Tail>
        : [Head, ...Split<Tail>]
    : S extends `/`
      ? []
      : S extends `${infer Head}/`
        ? [Head]
        : [S]

type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

type AnySchema = {
    body: unknown
    headers: unknown
    query: unknown
    params: unknown
    response: any
}

type MaybeArray<T> = T | T[]

export namespace EdenTreaty {
    export type Create<App extends Elysia<any, any, any, any, any, any>> =
        App extends {
            schema: infer Schema extends Record<string, any>
        }
            ? UnionToIntersect<Sign<Schema>>
            : 'Please install Elysia before using Eden'

    type SplitKeys<T> = T extends [infer First, ...infer Rest]
        ? [First, Rest]
        : T extends [infer First, ...infer Rest][number]
          ? [First, Rest]
          : never

    type UnwrapPromise<T> = T extends Promise<infer A> ? A : T

    export type Transform<T = unknown> = MaybeArray<
        (
            response: unknown extends T
                ? {
                      data: any
                      error: any
                      response: Response
                      status: number
                      headers: Headers
                  }
                : UnwrapPromise<T>
        ) => UnwrapPromise<T> | void
    >

    export interface Config {
        /**
         * Default options to pass to fetch
         */
        $fetch?: RequestInit
        fetcher?: typeof fetch
        transform?: Transform
    }

    export type DetailedResponse = {
      data: any
      error: any
      response: Response
      status: number
      headers: Headers
    };

    export type Sign<
        Schema extends Record<string, Record<string, unknown>>,
        Paths extends (string | number)[] = Split<keyof Schema & string>,
        Carry extends string = ''
    > = Paths extends [
        infer Prefix extends string | number,
        ...infer Rest extends (string | number)[]
    ]
        ? {
              [Key in Prefix as Prefix extends `:${string}`
                  ? (string & {}) | number | Prefix
                  : Prefix]: Sign<Schema, Rest, `${Carry}/${Key}`>
          }
        : Schema[Carry extends '' ? '/' : Carry] extends infer Routes
          ? {
                [Method in keyof Routes]: Routes[Method] extends infer Route extends
                    AnySchema
                    ? Method extends 'subscribe'
                        ? undefined extends Route['query']
                            ? (params?: {
                                  $query?: Record<string, string>
                              }) => EdenWS<Route>
                            : (params: {
                                  $query: Route['query']
                              }) => EdenWS<Route>
                        : ((
                                params: {
                                    $fetch?: RequestInit
                                    getRaw?: boolean
                                } & (IsUnknown<Route['body']> extends false
                                    ? Replace<
                                          Route['body'],
                                          Blob | Blob[],
                                          Files
                                      >
                                    : {}) &
                                    (undefined extends Route['query']
                                        ? {
                                              $query?: Record<string, string>
                                          }
                                        : {
                                              $query: Route['query']
                                          }) &
                                    (undefined extends Route['headers']
                                        ? {
                                              $headers?: Record<string, unknown>
                                          }
                                        : {
                                              $headers: Route['headers']
                                          })
                            ) => Promise<
                                (
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
                                ) & {
                                    status: number
                                    response: Response
                                    headers: Record<string, string>
                                }
                            >) extends (params: infer Params) => infer Response
                          ? {
                                $params: undefined
                                $headers: undefined
                                $query: undefined
                            } extends Params
                              ? (
                                    params?: Params,
                                    options?: {
                                        fetch?: RequestInit
                                        transform?: EdenTreaty.Transform<Response>
                                        // @ts-ignore
                                        query?: Params['query']
                                        // @ts-ignore
                                        headers?: Params['headers']
                                    }
                                ) => Response
                              : (
                                    params: Params,
                                    options?: {
                                        fetch?: RequestInit
                                        transform?: EdenTreaty.Transform<Response>
                                        // @ts-ignore
                                        query?: Params['query']
                                        // @ts-ignore
                                        headers?: Params['headers']
                                    }
                                ) => Response
                          : never
                    : never
            }
          : {}

    export interface OnMessage<Data = unknown> extends MessageEvent {
        data: Data
        rawData: MessageEvent['data']
    }

    export type ExecuteOptions = {
      getRaw?: boolean
    };
    export type ExecuteReturnType<T extends ExecuteOptions> = T['getRaw'] extends true ? Response : DetailedResponse;

    export type WSEvent<
        K extends keyof WebSocketEventMap,
        Data = unknown
    > = K extends 'message' ? OnMessage<Data> : WebSocketEventMap[K]
}
