import type {
    Elysia,
    SCHEMA,
    IsPathParameter,
    EXPOSED,
    AnyTypedSchema
} from 'elysia'

import type { EdenWS } from '.'

export type IsAny<T> = 0 extends 1 & T ? true : false

export type IsUnknown<T> = IsAny<T> extends true
    ? false
    : unknown extends T
    ? true
    : false

export type LegacyEden<App extends Elysia<any>> = App['meta'] extends {
    [key in typeof SCHEMA]: infer Schema extends Record<
        string,
        Record<string, AnyTypedSchema>
    >
}
    ? UnionToIntersection<
          CreateLegacyEden<Schema, Exclude<keyof Schema, number | symbol>>
      >
    : 'Please install Elysia before using Eden'

export interface LegacyEdenCall {
    [x: string]: any
    $fetch?: RequestInit
    $query?: Record<string, string | boolean | number>
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never

export type MergeUnionObjects<T> = {} & { [P in keyof T]: T[P] }

export type CreateLegacyEden<
    Server extends Record<string, Record<string, AnyTypedSchema>>,
    // pathnames are always string
    Path extends string,
    Full extends string = ''
> = Path extends `/${infer Start}`
    ? CreateLegacyEden<Server, Start, Path>
    : Path extends `${infer A}/${infer B}`
    ? // If path parameters, accept any string
      IsPathParameter<A> extends never
        ? {
              [key in A]: CreateLegacyEden<Server, B, Full>
          }
        : Record<string, CreateLegacyEden<Server, B, Full>> &
              Record<
                  `$${A}`,
                  `Expected path parameters ':${A}', replace this with any string`
              >
    : // Iterate until last string then catch method
      {
          [key in Path extends ''
              ? // If end with empty, then return as index
                'index'
              : Path | CamelCase<Path>]: Full extends keyof Server
              ? {
                    // Check if is method
                    [key in keyof Server[Full] extends string
                        ? Lowercase<keyof Server[Full]>
                        : keyof Server[Full]]: Server[Full][key extends string
                        ? Uppercase<key>
                        : key] extends infer Route extends AnyTypedSchema
                        ? IsUnknown<Route['body']> extends true
                            ? (params?: {
                                  $query?: LegacyEdenCall['$query']
                                  $fetch?: LegacyEdenCall['$fetch']
                              }) => Promise<
                                  Route['response'] extends {
                                      200: infer ReturnedType
                                  }
                                      ? ReturnedType
                                      : unknown
                              >
                            : (
                                  params: MergeUnionObjects<
                                      Route['body'] & {
                                          $query?: LegacyEdenCall['$query']
                                          $fetch?: LegacyEdenCall['$fetch']
                                      }
                                  >
                              ) => Promise<
                                  Route['response'] extends {
                                      200: infer ReturnedType
                                  }
                                      ? ReturnedType
                                      : unknown
                              >
                        : key extends 'subscribe'
                        ? // Since subscribe key is only a lower letter
                          Server[Full][key] extends infer Route extends AnyTypedSchema
                            ? IsUnknown<Route['query']> extends true
                                ? (params?: {
                                      $query?: LegacyEdenCall['$query']
                                  }) => EdenWS<Route>
                                : Route['query'] extends NonNullable<
                                      Route['query']
                                  >
                                ? (params: {
                                      $query: Route['query']
                                  }) => EdenWS<Route>
                                : (params?: {
                                      $query?: LegacyEdenCall['$query']
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

export type LegacyEdenWSEvent<
    K extends keyof WebSocketEventMap,
    Data = unknown
> = K extends 'message' ? EdenWSOnMessage<Data> : WebSocketEventMap[K]

export interface LegacyEdenConfig {
    fn?: string
    fetch?: Omit<RequestInit, 'body'>
}
