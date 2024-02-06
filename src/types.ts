import type { EdenFetchError } from './errors'

// https://stackoverflow.com/a/39495173
type Range<F extends number, T extends number> = Exclude<
    Enumerate<T>,
    Enumerate<F>
>

type Enumerate<
    N extends number,
    Acc extends number[] = []
> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

type ErrorRange = Range<300, 599>

export type MapError<T extends Record<number, unknown>> = [
    {
        [K in keyof T]-?: K extends ErrorRange ? K : never
    }[keyof T]
] extends [infer A extends number]
    ? {
          [K in A]: EdenFetchError<K, T[K]>
      }[A]
    : false

export type UnionToIntersect<U> = (
    U extends any ? (arg: U) => any : never
) extends (arg: infer I) => void
    ? I
    : never

export type UnionToTuple<T> = UnionToIntersect<
    T extends any ? (t: T) => T : never
> extends (_: any) => infer W
    ? [...UnionToTuple<Exclude<T, W>>, W]
    : []

export type IsAny<T> = 0 extends 1 & T ? true : false

export type IsNever<T> = [T] extends [never] ? true : false

export type IsUnknown<T> = IsAny<T> extends true
    ? false
    : unknown extends T
    ? true
    : false

export type AnyTypedRoute = {
    body?: unknown
    headers?: unknown
    query?: unknown
    params?: unknown
    response: Record<number, unknown>
}

export type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

export type TreatyToPath<T, Path extends string = ''> = UnionToIntersect<
    T extends Record<string, unknown>
        ? {
              [K in keyof T]: T[K] extends AnyTypedRoute
                  ? { [path in Path]: { [method in K]: T[K] } }
                  : unknown extends T[K]
                  ? { [path in Path]: { [method in K]: T[K] } }
                  : TreatyToPath<T[K], `${Path}/${K & string}`>
          }[keyof T]
        : {}
>
