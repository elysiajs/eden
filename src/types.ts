import type { Elysia, SCHEMA, TypedRoute } from 'elysia'
import { TObject } from '@sinclair/typebox'
import { EdenWS } from '.'

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
            ? {
                  $query: Route['query']
              }
            : {})

export type CreateEden<
    Server extends Record<string, Record<string, TypedRoute>>,
    // @ts-ignore
    Path extends string = keyof Server,
    Full extends string = ''
> = Path extends `/${infer Start}`
    ? CreateEden<Server, Start, Path>
    : Path extends `${infer A}/${infer B}`
    ? {
          [key in A]: CreateEden<Server, B, Full>
      }
    : {
          [key in Path extends ''
              ? 'index'
              : Path extends `:${infer params}`
              ? string
              : Path | CamelCase<Path>]: Full extends keyof Server
              ? {
                    [key in keyof Server[Full]]: keyof TypedRouteToParams<
                        Server[Full][key]
                    > extends never
                        ? key extends 'subscribe'
                            ? (
                                  params?: Server[Full][key]['query'] extends NonNullable<
                                      Server[Full][key]['query']
                                  >
                                      ? {
                                            $query: Server[Full][key]['query']
                                        }
                                      : {
                                            $query?: EdenCall['$query']
                                        }
                              ) => EdenWS<Server[Full][key]>
                            : (params?: {
                                  $query?: EdenCall['$query']
                                  $fetch?: EdenCall['$fetch']
                              }) => Promise<Server[Full][key]['response']>
                        : key extends 'subscribe'
                        ? (
                              params?: Server[Full][key]['query'] extends NonNullable<
                                  Server[Full][key]['query']
                              >
                                  ? {
                                        $query: Server[Full][key]['query']
                                    }
                                  : {
                                        $query?: EdenCall['$query']
                                    }
                          ) => EdenWS<Server[Full][key]>
                        : (
                              params: TypedRouteToParams<Server[Full][key]> & {
                                  $query?: EdenCall['$query']
                                  $fetch?: EdenCall['$fetch']
                              }
                          ) => Promise<Server[Full][key]['response']>
                }
              : never
      }

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
