import type { Elysia, InputSchema } from 'elysia'

import { EdenFetchError } from '../errors'

import { composePath } from './utils'
import type { EdenTreaty } from './types'

export type { EdenTreaty } from './types'

// @ts-ignore
const isServer = typeof FileList === 'undefined'

const isFile = (v: any) => {
    // @ts-ignore
    if (isServer) {
        return v instanceof Blob
    } else {
        // @ts-ignore
        return v instanceof FileList || v instanceof File
    }
}

// FormData is 1 level deep
const hasFile = (obj: Record<string, any>) => {
    if (!obj) return false

    for (const key in obj) {
        if (isFile(obj[key])) return true
        else if (
            Array.isArray(obj[key]) &&
            (obj[key] as unknown[]).find((x) => isFile(x))
        )
            return true
    }

    return false
}

// @ts-ignore
const fileToBlob = (v: File) =>
    isServer
        ? v
        : new Promise<Blob>((resolve) => {
              // @ts-ignore
              const reader = new FileReader()

              reader.onload = () => {
                  resolve(new Blob([reader.result!], { type: v.type }))
              }

              reader.readAsArrayBuffer(v)
          })

export class EdenWS<Schema extends InputSchema<any> = InputSchema> {
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
        listener: (event: EdenTreaty.WSEvent<K, Schema['response']>) => void,
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

    subscribe(
        onMessage: (
            event: EdenTreaty.WSEvent<'message', Schema['response']>
        ) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        return this.addEventListener('message', onMessage, options)
    }

    addEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (event: EdenTreaty.WSEvent<K, Schema['response']>) => void,
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
                        } catch {
                            // Not Empty
                        }
                    else if (!Number.isNaN(+data)) data = +data
                    else if (data === 'true') data = true
                    else if (data === 'fase') data = false

                    listener({
                        ...ws,
                        data
                    } as any)
                } else listener(ws as any)
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

const createProxy = (
    domain: string,
    path = '',
    config: EdenTreaty.Config
): Record<string, unknown> =>
    new Proxy(() => {}, {
        get(target, key, value) {
            return createProxy(domain, `${path}/${key.toString()}`, config)
        },
        apply(
            target,
            _,
            [
                { $query, $fetch, $headers, ...bodyObj } = {
                    $fetch: undefined,
                    $headers: undefined,
                    $query: undefined
                }
            ]: {
                [x: string]: any
                $fetch?: RequestInit
                $headers?: HeadersInit
                $query?: Record<string, string>
            }[] = [{}]
        ) {
            const i = path.lastIndexOf('/'),
                method = path.slice(i + 1),
                url = composePath(domain, i === -1 ? '/' : path.slice(0, i), $query)

            const fetcher = config.fetcher ?? fetch

            if (method === 'subscribe')
                return new EdenWS(
                    url.replace(
                        /^([^]+):\/\//,
                        url.startsWith('https://') ? 'wss://' : 'ws://'
                    )
                )

            const execute = async () => {
                let body: any

                const headers = {
                    ...config.$fetch?.headers,
                    ...$fetch?.headers,
                    ...$headers
                } as Record<string, string>

                if (method !== 'GET' && method !== 'HEAD') {
                    body = Object.keys(bodyObj).length ? bodyObj : undefined
                    const isObject = typeof body === 'object'
                    const isFormData = isObject && hasFile(body)

                    if (isFormData) {
                        const newBody = new FormData()

                        // FormData is 1 level deep
                        for (const [key, field] of Object.entries(body)) {
                            if (isServer) {
                                newBody.append(key, field as any)
                            } else {
                                // @ts-ignore
                                if (field instanceof File)
                                    newBody.append(
                                        key,
                                        await fileToBlob(field as any)
                                    )
                                // @ts-ignore
                                else if (field instanceof FileList) {
                                    // @ts-ignore
                                    for (let i = 0; i < field.length; i++) {
                                        newBody.append(
                                            key as any,
                                            await fileToBlob((field as any)[i])
                                        )
                                    }
                                } else newBody.append(key, field as string)
                            }
                        }

                        body = newBody
                    } else {
                        headers['content-type'] = isObject
                            ? 'application/json'
                            : 'text/plain'

                        if (isObject) body = JSON.stringify(body)
                    }
                }

                const response = await fetcher(url, {
                    method,
                    body,
                    ...config.$fetch,
                    ...$fetch,
                    headers
                })

                let data

                switch (response.headers.get('Content-Type')?.split(';')[0]) {
                    case 'application/json':
                        data = await response.json()
                        break

                    default:
                        data = await response.text().then((data) => {
                            if (!Number.isNaN(+data)) return +data
                            if (data === 'true') return true
                            if (data === 'false') return false

                            return data
                        })
                }

                if (response.status > 300)
                    return {
                        data,
                        error: new EdenFetchError(response.status, await data),
                        status: response.status,
                        raw: response,
                        headers: response.headers,
                    }

                return {
                    data,
                    status: response.status,
                    response: response,
                    headers: response.headers,
                    error: null as null
                }
            }

            return execute()
        }
    }) as unknown as Record<string, unknown>

export const edenTreaty = <App extends Elysia<any, any>>(
    domain: string,
    config: EdenTreaty.Config = {
        fetcher: fetch
    }
): EdenTreaty.Create<App> =>
    new Proxy(
        {},
        {
            get(target, key) {
                return createProxy(domain, key as string, config)
            }
        }
    ) as any
