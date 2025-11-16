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

type IsExactlyUnknown<T> = [T] extends [unknown]
    ? [unknown] extends [T]
    ? true
    : false
    : false;

type IsUndefined<T> = [T] extends [undefined] ? true : false

type IsMatchingEmptyObject<T> = [T] extends [{}]
    ? [{}] extends [T]
    ? true
    : false
    : false

export type MaybeEmptyObject<
    TObj,
    TKey extends PropertyKey,
    TFallback = Record<string, unknown>
> = IsUndefined<TObj> extends true
    ? { [K in TKey]?: TFallback }
    : IsExactlyUnknown<TObj> extends true
    ? { [K in TKey]?: TFallback }
    : IsMatchingEmptyObject<TObj> extends true
    ? { [K in TKey]?: TObj }
    : undefined extends TObj
    ? { [K in TKey]?: TObj }
    : null extends TObj
    ? { [K in TKey]?: TObj }
    : { [K in TKey]: TObj }

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

export type Not<T> = T extends true ? false : true

/**
 * Transforms a type to match its JSON.stringify() serialization behavior.
 * This handles:
 * - Objects with .toJSON() methods (e.g., DDD domain instances)
 * - Date objects (converted to string)
 * - Arrays (recursively serialized)
 * - Objects (recursively serialized, excluding functions)
 * - Primitives (unchanged)
 *
 * Special types like AsyncGenerator, Generator, ReadableStream, File, and Blob
 * are preserved as-is since they're handled by other transformations or runtime.
 */
export type JSONSerialized<T> = T extends { toJSON(): infer R }
    ? R extends () => infer U
    ? JSONSerialized<U>
    : JSONSerialized<R>
    : T extends Date
    ? string
    : T extends Function
    ? never
    : T extends AsyncGenerator<infer A, infer B, infer C>
    ? AsyncGenerator<A, B, C>
    : T extends Generator<infer A, infer B, infer C>
    ? Generator<A, B, C>
    : T extends ReadableStream<infer R>
    ? ReadableStream<R>
    : T extends File
    ? File
    : T extends Blob
    ? Blob
    : T extends Array<infer U>
    ? Array<JSONSerialized<U>>
    : T extends object
    ? { [K in keyof T as T[K] extends Function ? never : K]: JSONSerialized<T[K]> }
    : T