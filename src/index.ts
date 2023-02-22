import type { Elysia, TypedSchema, HTTPMethod } from 'elysia'

import type {
    CreateEden,
    Eden,
    EdenCall,
    EdenConfig,
    EdenWSEvent,
    UnionToIntersection
} from './types'
import { composePath, EdenFetchError, Signal } from './utils'

export class EdenWS<Schema extends TypedSchema<any> = TypedSchema> {
    ws: WebSocket
    url: string

    constructor(url: string) {
        this.ws = new WebSocket(url)
        this.url = url
    }

    send(data: Schema['body'] | Schema['body'][]) {
        if (Array.isArray(data)) {
            data.forEach((datum) => this.send(datum))

            return this
        }

        this.ws.send(
            typeof data === 'object' ? JSON.stringify(data) : data.toString()
        )

        return this
    }

    on<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (event: EdenWSEvent<K, Schema['response']>) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        return this.addEventListener(type, listener, options)
    }

    off<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ) {
        this.ws.removeEventListener(type, listener, options)

        return this
    }

    addEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (event: EdenWSEvent<K, Schema['response']>) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        this.ws.addEventListener(
            type,
            (ws) => {
                if (type === 'message') {
                    let data = (ws as MessageEvent).data.toString() as any
                    const start = data.charCodeAt(0)

                    if (start === 47 || start === 123)
                        try {
                            data = JSON.parse(data)
                        } catch {}
                    else if (!Number.isNaN(+data)) data = +data
                    else if (data === 'true') data = true
                    else if (data === 'fase') data = false

                    // @ts-ignore
                    listener({
                        ...ws,
                        data
                    })
                } else {
                    // @ts-ignore
                    listener(ws)
                }
            },
            options
        )

        return this
    }

    removeEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ) {
        this.off(type, listener, options)

        return this
    }

    close() {
        this.ws.close()

        return this
    }
}

const createFn = (
    domain: string,
    procedure: string[],
    signal: Signal
): Record<string, unknown> =>
    // @ts-ignore
    new Proxy((...v: any[]) => {}, {
        get(target, key, value) {
            return createFn(domain, [...procedure, key as string], signal)
        },
        apply(target, _, params) {
            const param = params[0]

            if (procedure.length === 1) {
                if (
                    procedure[0] in Object.prototype ||
                    procedure[0] in Promise.prototype
                )
                    return target(params)

                switch (procedure[0]) {
                    case 'toJSON':
                        return target(params)

                    case '$set':
                        return signal.setConfig(param)

                    case '$clone':
                        return createFn(domain, [], signal.clone(param))
                }
            }

            return signal.run(procedure, param).then((result) => {
                if (result instanceof Error) throw result

                return result
            })
        }
    })

const createProxy = (
    domain: string,
    path: string = '',
    config: EdenConfig
): Record<string, unknown> =>
    new Proxy(() => {}, {
        get(target, key, value) {
            return createProxy(domain, `${path}/${key.toString()}`, config)
        },
        apply(
            target,
            _,
            [
                { $query, $fetch, $body, ...bodyObj } = {
                    $fetch: undefined,
                    $query: undefined,
                    $body: undefined
                }
            ]: EdenCall[] = [{}]
        ) {
            const i = path.lastIndexOf('/'),
                method = path.slice(i + 1),
                url = composePath(domain, path.slice(0, i), $query)

            if (method === 'subscribe')
                return new EdenWS(
                    url.replace(
                        /^([^]+):\/\//,
                        url.startsWith('https://') ? 'wss://' : 'ws://'
                    )
                )

            const body =
                $body ?? (Object.keys(bodyObj).length ? bodyObj : undefined)
            const isObject = typeof body === 'object'

            return fetch(url, {
                method,
                body: isObject ? JSON.stringify(body) : body,
                ...config.fetch,
                ...$fetch,
                headers: body
                    ? {
                          'content-type': isObject
                              ? 'application/json'
                              : 'text/plain',
                          ...config.fetch?.headers,
                          ...$fetch?.['headers']
                      }
                    : undefined
            }).then(async (res) => {
                if (res.status > 300) {
                    let data

                    if (
                        res.headers
                            .get('content-type')
                            ?.includes('application/json')
                    )
                        try {
                            data = await res.json()
                        } catch (_) {
                            data = await res.text()
                        }
                    else data = await res.text()

                    return new EdenFetchError(res.status, data)
                }

                if (
                    res.headers
                        .get('content-type')
                        ?.includes('application/json')
                )
                    try {
                        return await res.json()
                    } catch (_) {
                        // if json is error then it's string
                        // flow down
                    }

                let data = await res.text()

                if (!Number.isNaN(+data)) return +data
                if (data === 'true') return true
                if (data === 'false') return false

                return data
            })
        }
    }) as unknown as Record<string, unknown>

export const eden = <App extends Elysia<any>>(
    domain: string,
    config: EdenConfig = {}
): Eden<App> =>
    new Proxy(
        {},
        {
            get(target, key) {
                if (key === '$fn')
                    return createFn(domain, [], new Signal(domain, config))

                return createProxy(domain, key as string, config)
            }
        }
    ) as any
