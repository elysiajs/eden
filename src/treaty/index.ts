import type { Elysia, TypedSchema } from 'elysia'

import { EdenFetchError } from '../utils'

import { composePath } from './utils'
import type { EdenTreaty } from './types'

export type { EdenTreaty } from './types'

const isFile = (v: any) => {
    // @ts-ignore
    if (typeof FileList === 'undefined') return false

    // @ts-ignore
    return v instanceof FileList || v instanceof File
}

// FormData is 1 level deep
const hasFile = (obj: Record<string, any>) => {
    for (let key in obj) {
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
    new Promise<Blob>((resolve) => {
        // @ts-ignore
        const reader = new FileReader()

        reader.onload = () => {
            resolve(new Blob([reader.result!], { type: v.type }))
        }

        reader.readAsArrayBuffer(v)
    })

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
                        } catch {}
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
    path: string = '',
    config: {}
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
            ]: EdenTreaty.CallOption[] = [{}]
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

            return (async () => {
                let body =
                    $body ?? (Object.keys(bodyObj).length ? bodyObj : undefined)
                const isObject = typeof body === 'object'
                const isFormData = isObject && hasFile(body)

                if (isFormData) {
                    const newBody = new FormData()

                    // FormData is 1 level deep
                    for (const [key, field] of Object.entries(body)) {
                        // @ts-ignore
                        if (field instanceof File)
                            newBody.append(key, await fileToBlob(field as any))
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

                    body = newBody
                } else if (isObject) body = JSON.stringify(body)

                return fetch(url, {
                    method,
                    body,
                    // ...config.fetch,
                    ...$fetch,
                    headers: body
                        ? isFormData
                            ? $fetch?.['headers']
                            : {
                                  'content-type': isObject
                                      ? 'application/json'
                                      : 'text/plain',
                                  ...$fetch?.['headers']
                              }
                        : $fetch?.['headers']
                }).then(async (res) => {
                    let data

                    switch (res.headers.get('Content-Type')?.split(';')[0]) {
                        case 'application/json':
                            data = await res.json()
                            break

                        default:
                            data = await res.text().then((data) => {
                                if (!Number.isNaN(+data)) return +data
                                if (data === 'true') return true
                                if (data === 'false') return false

                                return data
                            })
                    }

                    if (res.status > 300)
                        return {
                            data,
                            error: new EdenFetchError(res.status, await data)
                        }

                    return { data, error: null }
                })
            })()
        }
    }) as unknown as Record<string, unknown>

export const edenTreaty = <App extends Elysia<any>>(
    domain: string,
    config: {} = {}
): EdenTreaty.Create<App> =>
    new Proxy(
        {},
        {
            get(target, key) {
                return createProxy(domain, key as string, config)
            }
        }
    ) as any
