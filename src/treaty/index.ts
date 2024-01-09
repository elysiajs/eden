import type { Elysia, InputSchema } from 'elysia'

import { EdenFetchError } from '../errors'

import { composePath, isNumericString } from './utils'
import type { EdenTreaty } from './types'

export type { EdenTreaty } from './types'

import { CookieJar } from 'tough-cookie'
import { addCookiesToJar } from './cookies'

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
const createNewFile = (v: File) =>
    isServer
        ? v
        : new Promise<File>((resolve) => {
              // @ts-ignore
              const reader = new FileReader()

              reader.onload = () => {
                  const file = new File([reader.result!], v.name, {
                      lastModified: v.lastModified,
                      type: v.type
                  })
                  resolve(file)
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
                    else if (isNumericString(data)) data = +data
                    else if (data === 'true') data = true
                    else if (data === 'false') data = false

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
    config: EdenTreaty.Config,
    cookieJar: CookieJar
): Record<string, unknown> =>
    new Proxy(() => {}, {
        get(target, key, value) {
            return createProxy(
                domain,
                `${path}/${key.toString()}`,
                config,
                cookieJar
            )
        },
        // @ts-ignore
        apply(
            target,
            _,
            [initialBody, options = {}]: [
                {
                    [x: string]: any
                    $fetch?: RequestInit
                    $headers?: HeadersInit
                    $query?: Record<string, string>
                    getRaw?: boolean
                },
                {
                    fetch?: RequestInit
                    transform?: EdenTreaty.Transform
                    headers?: Record<string, string>
                    query?: Record<string, string | number>
                }
            ] = [{}, {}]
        ) {
            let bodyObj: any =
                initialBody !== undefined &&
                (typeof initialBody !== 'object' || Array.isArray(initialBody))
                    ? initialBody
                    : undefined

            const {
                $query,
                $fetch,
                $headers,
                $transform,
                getRaw,
                ...restBody
            } = initialBody ?? {}

            bodyObj ??= restBody

            const i = path.lastIndexOf('/'),
                method = path.slice(i + 1).toUpperCase(),
                url = composePath(
                    domain,
                    i === -1 ? '/' : path.slice(0, i),
                    Object.assign(options.query ?? {}, $query)
                )

            const fetcher = config.fetcher ?? fetch
            let transforms = config.transform
                ? Array.isArray(config.transform)
                    ? config.transform
                    : [config.transform]
                : undefined

            const $transforms = $transform
                ? Array.isArray($transform)
                    ? $transform
                    : [$transform]
                : undefined

            if ($transforms) {
                if (transforms) transforms = $transforms.concat(transforms)
                else transforms = $transforms as any
            }

            if (method === 'SUBSCRIBE')
                return new EdenWS(
                    url.replace(
                        /^([^]+):\/\//,
                        url.startsWith('https://') ? 'wss://' : 'ws://'
                    )
                )

            const execute = async <T extends EdenTreaty.ExecuteOptions>(
                modifiers: T
            ): Promise<EdenTreaty.ExecuteReturnType<T>> => {
                let body: any

                const headers = {
                    ...config.$fetch?.headers,
                    ...$fetch?.headers,
                    ...options.headers,
                    ...$headers,
                    ...(config.persistCookies
                        ? { Cookie: cookieJar.getCookieStringSync(url) }
                        : {})
                } as Record<string, string>

                if (method !== 'GET' && method !== 'HEAD') {
                    body = Object.keys(bodyObj).length
                        ? bodyObj
                        : Array.isArray(bodyObj)
                        ? bodyObj
                        : undefined

                    const isObject =
                        typeof body === 'object' || Array.isArray(bodyObj)
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
                                        await createNewFile(field as any)
                                    )
                                // @ts-ignore
                                else if (field instanceof FileList) {
                                    // @ts-ignore
                                    for (let i = 0; i < field.length; i++) {
                                        newBody.append(
                                            key as any,
                                            await createNewFile(
                                                (field as any)[i]
                                            )
                                        )
                                    }
                                } else if (Array.isArray(field)) {
                                    for (let i = 0; i < field.length; i++) {
                                        const value = (field as any)[i]

                                        newBody.append(
                                            key as any,
                                            value instanceof File
                                                ? await createNewFile(value)
                                                : value
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

                        body = isObject ? JSON.stringify(body) : bodyObj
                    }
                }

                const response = await fetcher(url, {
                    method,
                    body,
                    ...config.$fetch,
                    ...options.fetch,
                    ...$fetch,
                    headers
                })

                if (config.persistCookies) {
                    addCookiesToJar(
                        cookieJar,
                        response.headers.getSetCookie(),
                        url
                    )
                }

                let data

                if (modifiers.getRaw) return response as any
                switch (response.headers.get('Content-Type')?.split(';')[0]) {
                    case 'application/json':
                        data = await response.json()
                        break

                    default:
                        data = await response.text().then((data) => {
                            if (isNumericString(data)) return +data
                            if (data === 'true') return true
                            if (data === 'false') return false

                            return data
                        })
                }

                const error =
                    response.status >= 300 || response.status < 200
                        ? new EdenFetchError(response.status, data)
                        : null

                let executeReturn = {
                    data,
                    error,
                    response,
                    status: response.status,
                    headers: response.headers
                }

                if (transforms)
                    for (const transform of transforms) {
                        let temp = transform(executeReturn)
                        if (temp instanceof Promise) temp = await temp
                        if (temp !== undefined && temp !== null)
                            executeReturn = temp as any
                    }

                return executeReturn as any
            }

            return execute({ getRaw })
        }
    }) as unknown as Record<string, unknown>

export const edenTreaty = <App extends Elysia<any, any, any, any, any, any>>(
    domain: string,
    config: EdenTreaty.Config = {
        fetcher: fetch
    }
): EdenTreaty.Create<App> => {
    const jar = new CookieJar()

    return new Proxy(
        {},
        {
            get(target, key) {
                return createProxy(domain, key as string, config, jar)
            }
        }
    ) as any
}
