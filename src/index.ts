import type { Elysia, TypedSchema } from 'elysia'

import type { Eden, EdenConfig } from './types'

import { EdenFetchError, Signal } from './utils'

const createFn = (
    domain: string,
    procedures: string[],
    signal: Signal
): Record<string, unknown> =>
    // @ts-ignore
    new Proxy((..._: any[]) => {}, {
        get(target, key, value) {
            return createFn(domain, [...procedures, key as string], signal)
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
                        return createFn(domain, [], signal.clone(param))
                }
            }

            return signal.run(procedures, params).then((result) => {
                if (result instanceof Error) throw result

                return result
            })
        }
    })

const edenFetch =
    (server: string) =>
    async (
        endpoint: string,
        {
            params,
            body,
            ...options
        }: Omit<RequestInit, 'headers'> & {
            headers?: Record<string, unknown>
            params?: Record<string, string>
        }
    ) => {
        if (params)
            Object.entries(params).forEach(([key, value]) => {
                endpoint = endpoint.replace(`:${key}`, value)
            })

        const contentType = options.headers?.['Content-Type']

        if (!contentType || contentType === 'application/json')
            body = JSON.stringify(body)

        return fetch(server + endpoint, {
            ...options,
            headers: {
                'content-type': 'application/json',
                ...options.headers
            },
            body
        }).then(async (res) => {
            let data: Promise<unknown>

            switch (res.headers.get('Content-Type')) {
                case 'application/json':
                    data = res.json()
                    break

                default:
                    data = res.text().then((data) => {
                        if (!Number.isNaN(+data)) return +data
                        if (data === 'true') return true
                        if (data === 'false') return false
                    })
            }

            if (res.status > 300)
                return new EdenFetchError(res.status, await data)

            return data
        })
    }

export const eden = <App extends Elysia<any>>(
    domain: string,
    config: EdenConfig = {}
): Eden<App> =>
    ({
        get fn() {
            return createFn(domain, [], new Signal(domain, config))
        },
        get fetch() {
            return edenFetch(domain)
        }
    } as any)
