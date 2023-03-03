import type { Elysia, EXPOSED } from 'elysia'

export namespace EdenFn {
    export type Create<App extends Elysia<any>> = App['meta'] extends Record<
        typeof EXPOSED,
        infer Schema extends Record<string, any>
    >
        ? EdenFn.Compose<Schema>
        : 'Please install Elysia before using Eden'

    export interface Config {}

    export type Compose<Exposed extends Record<string, any>> = Fn<Exposed> & {
        $set(config: Config): void
        $clone(config?: Config): Compose<Exposed>
    }

    export type Fn<T> = T extends {
        [EXPOSED]: any
        value: infer Value
    }
        ? Asynctify<Value>
        : Asynctify<T>

    export interface Config {
        fn?: string
        fetch?: Omit<RequestInit, 'body'>
    }
}

type Promisify<T extends (...args: any[]) => any> = T extends (
    ...args: infer Args
) => infer Return
    ? Return extends Promise<any>
        ? T
        : (...args: Args) => Promise<Return>
    : never

type Asynctify<T> = T extends infer Fn extends (...args: any) => any
    ? Promisify<Fn>
    : T extends Record<string, any>
    ? {
          [K in keyof T]: EdenFn.Fn<T[K]>
      }
    : never
