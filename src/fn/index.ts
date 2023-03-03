import { Signal } from './utils'
import type { EdenFn } from './types'
import Elysia from 'elysia'

export type { EdenFn } from './types'

const createProxy = (
    domain: string,
    procedures: string[],
    signal: Signal
): Record<string, unknown> =>
    new Proxy((..._: any[]) => {}, {
        get(target, key, value) {
            return createProxy(domain, [...procedures, key as string], signal)
        },
        apply(target, _, params) {
            const param = params[0]
            const procedure = procedures[0]

            if (procedures.length === 1) {
                if (
                    procedure in Object.prototype ||
                    procedure in Promise.prototype
                )
                    return target(...params)

                switch (procedure) {
                    case 'toJSON':
                        return target(...params)

                    case '$set':
                        return signal.setConfig(param)

                    case '$clone':
                        return createProxy(domain, [], signal.clone(param))
                }
            }

            return signal.run(procedures, params).then((result) => {
                if (result instanceof Error) throw result

                return result
            })
        }
    }) as any

export const edenFn = <App extends Elysia<any>>(
    domain: string,
    config?: EdenFn.Config
): EdenFn.Create<App> =>
    // @ts-ignore
    createProxy(domain, [], new Signal(domain, config))

export default edenFn
