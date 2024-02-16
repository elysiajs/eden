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

    export type Create<App extends Elysia<any, any, any, any, any, any, any, any>> =
        App extends {
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
            ? undefined extends Route['subscribe']['query']
                ? (params?: { query?: Record<string, string> }) => EdenWS<Route['subscribe']>
                : (params: {
                      query: Route['subscribe']['query']
                  }) => EdenWS<Route['subscribe']>
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
                        ? (
                              body?: Body,
                              options?: Prettify<Param & TreatyParam>
                          ) => Promise<TreatyResponse<Response>>
                        : (
                              body: Body extends Record<string, unknown>
                                  ? ReplaceBlobWithFiles<Body>
                                  : Body,
                              options?: Prettify<Param & TreatyParam>
                          ) => Promise<TreatyResponse<Response>>
                    : (
                          body: Body extends Record<string, unknown>
                              ? ReplaceBlobWithFiles<Body>
                              : Body,
                          options: Prettify<Param & TreatyParam>
                      ) => Promise<TreatyResponse<Response>>
                : never
            : keyof Route[K] extends `:${infer Param}`
            ? (params: Record<Param, string>) => Prettify<
                  Prettify<Sign<Route[K]>> & Sign<Route[K][`:${Param}`]>
              >
            : Prettify<Sign<Route[K]>>
    }

    export interface Config extends Omit<RequestInit, 'headers'> {
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
            (path: string, options: FetchRequestInit) => MaybePromise<unknown>
        >
        onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>
    }

    type TreatyResponse<Response extends Record<number, unknown>> =
        | {
              data: Response[200]
              error: null
          }
        | {
              data: null
              error: 200 extends keyof Response
                  ? {
                        status: unknown
                        value: unknown
                    }
                  : // @ts-expect-error
                    {
                        [Status in keyof Response as Status extends 200
                            ? never
                            : Status]: {
                            status: Status
                            value: Response[Status]
                        }
                    }[Exclude<keyof Response, 200>]
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
