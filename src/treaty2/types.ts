/// <reference lib="dom" />
import type { Elysia, ELYSIA_FORM_DATA } from 'elysia'

import { EdenWS } from './ws'
import type { IsNever, Not, Prettify } from '../types'

// type Files = File | FileList

// type Replace<RecordType, TargetType, GenericType> = {
//     [K in keyof RecordType]: RecordType[K] extends TargetType
//         ? GenericType
//         : RecordType[K]
// }

type And<A extends boolean, B extends boolean> = A extends true
    ? B extends true
        ? true
        : false
    : false

type ReplaceGeneratorWithAsyncGenerator<
    in out RecordType extends Record<string, unknown>
> = {
    [K in keyof RecordType]: IsNever<RecordType[K]> extends true
        ? RecordType[K]
        : RecordType[K] extends Generator<infer A, infer B, infer C>
          ? void extends B
              ? AsyncGenerator<A, B, C>
              : And<IsNever<A>, void extends B ? false : true> extends true
                ? B
                : AsyncGenerator<A, B, C> | B
          : RecordType[K] extends AsyncGenerator<infer A, infer B, infer C>
            ? And<Not<IsNever<A>>, void extends B ? true : false> extends true
                ? AsyncGenerator<A, B, C>
                : And<IsNever<A>, void extends B ? false : true> extends true
                  ? B
                  : AsyncGenerator<A, B, C> | B
            : RecordType[K] extends ReadableStream<infer A>
              ? AsyncGenerator<A, void, unknown>
              : RecordType[K]
} & {}

type MaybeArray<T> = T | T[]
type MaybePromise<T> = T | Promise<T>

export namespace Treaty {
    interface TreatyParam {
        fetch?: RequestInit
    }

    export type Create<App extends Elysia<any, any, any, any, any, any, any>> =
        App extends {
            '~Routes': infer Schema extends Record<string, any>
        }
            ? Prettify<Sign<Schema>> & CreateParams<Schema>
            : 'Please install Elysia before using Eden'

    export type Sign<in out Route extends Record<string, any>> = {
        [K in keyof Route as K extends `:${string}`
            ? never
            : K]: K extends 'subscribe' // ? Websocket route
            ? ({} extends Route['subscribe']['headers']
                  ? { headers?: Record<string, unknown> }
                  : undefined extends Route['subscribe']['headers']
                    ? { headers?: Record<string, unknown> }
                    : {
                          headers: Route['subscribe']['headers']
                      }) &
                  ({} extends Route['subscribe']['query']
                      ? { query?: Record<string, unknown> }
                      : undefined extends Route['subscribe']['query']
                        ? { query?: Record<string, unknown> }
                        : {
                              query: Route['subscribe']['query']
                          }) extends infer Param
                ? (options?: Param) => EdenWS<Route['subscribe']>
                : never
            : Route[K] extends {
                    body: infer Body
                    headers: infer Headers
                    params: any
                    query: infer Query
                    response: infer Res extends Record<number, unknown>
                }
              ? ({} extends Headers
                    ? {
                          headers?: Record<string, unknown>
                      }
                    : undefined extends Headers
                      ? { headers?: Record<string, unknown> }
                      : {
                            headers: Headers
                        }) &
                    ({} extends Query
                        ? {
                              query?: Record<string, unknown>
                          }
                        : undefined extends Query
                          ? { query?: Record<string, unknown> }
                          : { query: Query }) extends infer Param
                  ? {} extends Param
                      ? undefined extends Body
                          ? K extends 'get' | 'head'
                              ? (
                                    options?: Prettify<Param & TreatyParam>
                                ) => Promise<
                                    TreatyResponse<
                                        ReplaceGeneratorWithAsyncGenerator<Res>
                                    >
                                >
                              : (
                                    body?: Body,
                                    options?: Prettify<Param & TreatyParam>
                                ) => Promise<
                                    TreatyResponse<
                                        ReplaceGeneratorWithAsyncGenerator<Res>
                                    >
                                >
                          : {} extends Body
                            ? (
                                  body?: Body,
                                  options?: Prettify<Param & TreatyParam>
                              ) => Promise<
                                  TreatyResponse<
                                      ReplaceGeneratorWithAsyncGenerator<Res>
                                  >
                              >
                            : (
                                  body: Body,
                                  options?: Prettify<Param & TreatyParam>
                              ) => Promise<
                                  TreatyResponse<
                                      ReplaceGeneratorWithAsyncGenerator<Res>
                                  >
                              >
                      : K extends 'get' | 'head'
                        ? (
                              options: Prettify<Param & TreatyParam>
                          ) => Promise<
                              TreatyResponse<
                                  ReplaceGeneratorWithAsyncGenerator<Res>
                              >
                          >
                        : (
                              body: Body,
                              options: Prettify<Param & TreatyParam>
                          ) => Promise<
                              TreatyResponse<
                                  ReplaceGeneratorWithAsyncGenerator<Res>
                              >
                          >
                  : never
              : CreateParams<Route[K]>
    }

    type CreateParams<Route extends Record<string, any>> =
        Extract<keyof Route, `:${string}`> extends infer Path extends string
            ? IsNever<Path> extends true
                ? Prettify<Sign<Route>>
                : // ! DO NOT USE PRETTIFY ON THIS LINE, OTHERWISE FUNCTION CALLING WILL BE OMITTED
                  (((params: {
                      [param in Path extends `:${infer Param}`
                          ? Param extends `${infer Param}?`
                              ? Param
                              : Param
                          : never]: string | number
                  }) => Prettify<Sign<Route[Path]>> &
                      CreateParams<Route[Path]>) &
                      Prettify<Sign<Route>>) &
                      (Path extends `:${string}?`
                          ? CreateParams<Route[Path]>
                          : {})
            : never

    export interface Config {
        fetch?: Omit<RequestInit, 'headers' | 'method'>
        fetcher?: typeof fetch
        headers?: MaybeArray<
            | RequestInit['headers']
            | ((
                  path: string,
                  options: RequestInit
              ) => RequestInit['headers'] | void)
        >
        onRequest?: MaybeArray<
            (
                path: string,
                options: RequestInit
            ) => MaybePromise<RequestInit | void>
        >
        onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>
        keepDomain?: boolean
    }

    // type UnwrapAwaited<T extends Record<number, unknown>> = {
    //     [K in keyof T]: Awaited<T[K]>
    // }

    type SingleDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

    type SuccessKeys<R extends Record<number, unknown>> =
    { [K in keyof R]:
        K extends number
          ? `${K}` extends `2${SingleDigit}${SingleDigit}`
            ? K
            : never
          : never
    }[keyof R];

    export type TreatyResponse<Res extends Record<number, unknown>> =
        | {
              data: Res[SuccessKeys<Res>] extends {
                  [ELYSIA_FORM_DATA]: infer Data
              }
                  ? Data
                  : Res[SuccessKeys<Res>]
              error: null
              response: Response
              status: number
              headers: RequestInit['headers']
          }
        | {
              data: null
              error: Exclude<keyof Res, SuccessKeys<Res>> extends never
                  ? {
                        status: unknown
                        value: unknown
                    }
                  : {
                        [Status in keyof Res]: {
                            status: Status
                            value: Res[Status] extends {
                                [ELYSIA_FORM_DATA]: infer Data
                            }
                                ? Data
                                : Res[Status]
                        }
                    }[Exclude<keyof Res, SuccessKeys<Res>>]
              response: Response
              status: number
              headers: RequestInit['headers']
          }

    export interface OnMessage<Data = unknown> extends MessageEvent {
        data: Data
        rawData: MessageEvent['data']
    }

    export type WSEvent<
        K extends keyof WebSocketEventMap,
        Data = unknown
    > = K extends 'message' ? OnMessage<Data> : WebSocketEventMap[K]

    type MaybeFunction<T> = T | ((...a: any) => T)
    type UnwrapMaybeFunction<T> = T extends (...a: any) => infer R ? R : T

    type MaybePromise<T> = T | Promise<T>

    export type Data<
        Response extends MaybeFunction<MaybePromise<Treaty.TreatyResponse<{}>>>
    > = NonNullable<Awaited<UnwrapMaybeFunction<Response>>['data']>

    export type Error<
        Response extends MaybeFunction<MaybePromise<Treaty.TreatyResponse<{}>>>
    > = NonNullable<Awaited<UnwrapMaybeFunction<Response>>['error']>
}
