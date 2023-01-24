import type { Elysia, SCHEMA, TypedRoute, IsPathParameter } from 'elysia'
import type { TObject } from '@sinclair/typebox'

import type { EdenWS } from '.'

export type Eden<App extends Elysia<any>> = App['store'] extends {
    [key in typeof SCHEMA]: any
}
    ? UnionToIntersection<CreateEden<App['store'][typeof SCHEMA]>>
    : never

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
        : {
              [x: string]: CreateEden<Server, B, Full>
          } & {
              $params: `Expected path parameters ':${A}', replace this with any string`
          }
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
                        : keyof Server[Full]]: keyof TypedRouteToParams<
                        Server[Full][key extends string ? Uppercase<key> : key]
                    > extends never
                        ? key extends 'subscribe'
                            ? unknown extends NonNullable<
                                  Server[Full][key]['query']
                              >
                                ? (params?: {
                                      $query?: EdenCall['$query']
                                  }) => EdenWS<Server[Full][key]>
                                : Server[Full][key]['query'] extends NonNullable<
                                      Server[Full][key]['query']
                                  >
                                ? (params: {
                                      $query: Server[Full][key]['query']
                                  }) => EdenWS<Server[Full][key]>
                                : (params?: {
                                      $query?: EdenCall['$query']
                                  }) => EdenWS<Server[Full][key]>
                            : (params?: {
                                  $query?: EdenCall['$query']
                                  $fetch?: EdenCall['$fetch']
                              }) => Promise<
                                  key extends string
                                      ? Server[Full][Uppercase<key>]['response'] extends {
                                            200: infer ReturnedType
                                        }
                                          ? ReturnedType
                                          : unknown
                                      : Server[Full][key]['response'] extends {
                                            200: infer ReturnedType
                                        }
                                      ? ReturnedType
                                      : unknown
                              >
                        : key extends 'subscribe'
                        ? unknown extends NonNullable<
                              Server[Full][key]['query']
                          >
                            ? (params?: {
                                  $query?: EdenCall['$query']
                              }) => EdenWS<Server[Full][key]>
                            : Server[Full][key]['query'] extends NonNullable<
                                  Server[Full][key]['query']
                              >
                            ? (params: {
                                  $query: Server[Full][key]['query']
                              }) => EdenWS<Server[Full][key]>
                            : (params?: {
                                  $query?: EdenCall['$query']
                              }) => EdenWS<Server[Full][key]>
                        : (
                              params: TypedRouteToParams<
                                  Server[Full][key extends string
                                      ? Uppercase<key>
                                      : key]
                              > & {
                                  $query?: EdenCall['$query']
                                  $fetch?: EdenCall['$fetch']
                              }
                          ) => Promise<
                              Server[Full][key extends string
                                  ? Uppercase<key>
                                  : key]['response'] extends {
                                  200: infer ReturnedType
                              }
                                  ? ReturnedType
                                  : unknown
                          >
                }
              : never
      } & (Path extends `:${infer params}`
          ? {
                $params: `Expected path parameters ':${params}', replace this with any string`
            }
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
