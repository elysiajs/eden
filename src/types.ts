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
    U extends unknown ? (arg: U) => 0 : never
) extends (arg: infer I) => 0
    ? I
    : never

export type IsAny<T> = 0 extends 1 & T ? true : false

export type IsNever<T> = [T] extends [never] ? true : false

export type IsUnknown<T> = IsAny<T> extends true
    ? false
    : unknown extends T
    ? true
    : false

export type AnyTypedRoute = {
    body: unknown
    headers: Record<string, any> | undefined
    query: Record<string, any> | undefined
    params: Record<string, any> | undefined
    response: Record<string, unknown> & {
        '200': unknown
    }
}
