import type { TypedRoute } from 'elysia'

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
    (Route['body'] extends NonNullable<Route['body']> ? Route['body'] : {}) &
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
              : Path]: Full extends keyof Server
              ? {
                    [key in keyof Server[Full]]: keyof TypedRouteToParams<
                        Server[Full][key]
                    > extends never
                        ? (params?: {
                              $query?: EdenCall['$query']
                              $fetch?: EdenCall['$fetch']
                          }) => Promise<Server[Full][key]['response']>
                        : (
                              params: TypedRouteToParams<Server[Full][key]> & {
                                  $query?: EdenCall['$query']
                                  $fetch?: EdenCall['$fetch']
                              }
                          ) => Promise<Server[Full][key]['response']>
                }
              : never
      }
