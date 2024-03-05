/// <reference lib="dom" />
import type { Elysia } from 'elysia'
import { EdenWS } from './ws'
import type { Prettify } from '../types'

type Files = File | FileList

// type Replace<RecordType, TargetType, GenericType> = {
//     [K in keyof RecordType]: RecordType[K] extends TargetType
//         ? GenericType
//         : RecordType[K]
// }

type ReplaceBlobWithFiles<in out RecordType extends Record<string, unknown>> = {
    [K in keyof RecordType]: RecordType[K] extends Blob | Blob[]
        ? Files
        : RecordType[K]
} & {}

type MaybeArray<T> = T | T[]
type MaybePromise<T> = T | Promise<T>

export namespace Treaty {
    interface TreatyParam {
        fetch?: RequestInit
    }

    export type Create<
        App extends Elysia<any, any, any, any, any, any, any, any>
    > = App extends {
        _routes: infer Schema extends Record<string, any>
    }
        ? Prettify<Sign<Schema>>
        : 'Please install Elysia before using Eden'

    export type Sign<in out Route extends Record<string, any>> = {
        [K in keyof Route as K extends '/' | ''
            ? 'index'
            : K extends `:${string}`
            ? never
            : K]: K extends 'subscribe' // ? Websocket route
            ? (undefined extends Route['subscribe']['headers']
                  ? { headers?: Record<string, unknown> }
                  : {
                        headers: Route['subscribe']['headers']
                    }) &
                  (undefined extends Route['subscribe']['query']
                      ? { query?: Record<string, unknown> }
                      : {
                            query: Route['subscribe']['query']
                        }) extends infer Param
                ? {} extends Param
                    ? (options?: Param) => EdenWS<Route['subscribe']>
                    : (options?: Param) => EdenWS<Route['subscribe']>
                : never
            : Route[K] extends {
                  body: infer Body
                  headers: infer Headers
                  params: any
                  query: infer Query
                  response: infer Response extends Record<number, unknown>
              }
            ? (undefined extends Headers
                  ? { headers?: Record<string, unknown> }
                  : {
                        headers: Headers
                    }) &
                  (undefined extends Query
                      ? { query?: Record<string, unknown> }
                      : { query: Query }) extends infer Param
                ? {} extends Param
                    ? undefined extends Body
                        ? K extends 'get' | 'head'
                            ? (
                                  options?: Prettify<Param & TreatyParam>
                              ) => Promise<TreatyResponse<Response>>
                            : (
                                  body?: Body,
                                  options?: Prettify<Param & TreatyParam>
                              ) => Promise<TreatyResponse<Response>>
                        : (
                              body: Body extends Record<string, unknown>
                                  ? ReplaceBlobWithFiles<Body>
                                  : Body,
                              options?: Prettify<Param & TreatyParam>
                          ) => Promise<TreatyResponse<Response>>
                    : K extends 'get' | 'head'
                    ? (
                          options: Prettify<Param & TreatyParam>
                      ) => Promise<TreatyResponse<Response>>
                    : (
                          body: Body extends Record<string, unknown>
                              ? ReplaceBlobWithFiles<Body>
                              : Body,
                          options: Prettify<Param & TreatyParam>
                      ) => Promise<TreatyResponse<Response>>
                : never
            : keyof Route[K] extends `:${infer Param}`
            ? (
                  params: Record<Param, string>
              ) => Prettify<
                  Prettify<Sign<Route[K]>> & Sign<Route[K][`:${Param}`]>
              >
            : Prettify<Sign<Route[K]>>
    }

    export interface Config {
        fetch?: Omit<RequestInit, 'headers' | 'method'>
        fetcher?: typeof fetch
        headers?:
            | RequestInit['headers']
            | MaybeArray<
                  (
                      path: string,
                      options: RequestInit
                  ) => RequestInit['headers'] | void
              >
        onRequest?: MaybeArray<
            (
                path: string,
                options: FetchRequestInit
            ) => MaybePromise<FetchRequestInit | void>
        >
        onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>
    }

    type TreatyResponse<Res extends Record<number, unknown>> =
        | {
              data: Res[200]
              error: null
              response: Response
              status: number
              headers: FetchRequestInit['headers']
          }
        | {
              data: null
              error: Res extends { 200: unknown }
                  ? // @ts-expect-error
                    {
                        [Status in keyof Res as Status extends 200
                            ? never
                            : Status]: {
                            status: Status
                            value: Res[Status]
                        }
                    }[Exclude<keyof Response, 200>]
                  : {
                        status: unknown
                        value: unknown
                    }
              response: Response
              status: number
              headers: FetchRequestInit['headers']
          }

    export interface OnMessage<Data = unknown> extends MessageEvent {
        data: Data
        rawData: MessageEvent['data']
    }

    export type WSEvent<
        K extends keyof WebSocketEventMap,
        Data = unknown
    > = K extends 'message' ? OnMessage<Data> : WebSocketEventMap[K]
}
