import type { Elysia, InputSchema } from 'elysia'
import { EdenFetchError } from '../errors'
import { composePath } from './utils'
import type { EdenTreaty } from './types'
import { parseMessageEvent, parseStringifiedValue } from '../utils/parsingUtils'

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

// Recursively check if object contains files at any depth
const hasFile = (obj: Record<string, any>): boolean => {
    if (!obj) return false

    for (const key in obj) {
        const value = obj[key]
        if (isFile(value)) return true

        if (Array.isArray(value)) {
            for (const item of value) {
                if (isFile(item)) return true
                if (
                    typeof item === 'object' &&
                    item !== null &&
                    hasFile(item)
                )
                    return true
            }
        }

        if (
            typeof value === 'object' &&
            value !== null &&
            !(value instanceof Date) &&
            hasFile(value)
        )
            return true
    }

    return false
}

/**
 * Smart flatten: stringify file-less objects, flatten objects with files using dot notation
 * This provides optimal FormData size for TypeBox users (stringify) while maintaining
 * universal support for Zod/Valibot users who need dot notation for nested files.
 */
const flattenObject = (
    obj: Record<string, any>,
    prefix = ''
): Record<string, any> => {
    const result: Record<string, any> = {}

    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key

        if (isFile(value)) {
            result[newKey] = value
        } else if (Array.isArray(value)) {
            // Check if array contains files
            const arrayHasFiles = value.some(
                (item) =>
                    isFile(item) ||
                    (typeof item === 'object' && item !== null && hasFile(item))
            )

            if (arrayHasFiles) {
                // Flatten array with files using indexed dot notation
                for (let i = 0; i < value.length; i++) {
                    const item = value[i]
                    const indexKey = `${newKey}.${i}`
                    if (isFile(item)) {
                        result[indexKey] = item
                    } else if (typeof item === 'object' && item !== null) {
                        Object.assign(result, flattenObject(item, indexKey))
                    } else {
                        result[indexKey] = item
                    }
                }
            } else {
                // No files in array - stringify for ArrayString compatibility
                result[newKey] = JSON.stringify(value)
            }
        } else if (
            typeof value === 'object' &&
            value !== null &&
            !(value instanceof Date)
        ) {
            // Check if this nested object contains files
            if (hasFile(value)) {
                // Has files - must flatten with dot notation
                Object.assign(result, flattenObject(value, newKey))
            } else {
                // No files - stringify for ObjectString compatibility
                result[newKey] = JSON.stringify(value)
            }
        } else {
            result[newKey] = value
        }
    }

    return result
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

type MaybeArray<T> = T | T[]

export class EdenWS<Schema extends InputSchema<any> = InputSchema> {
    ws: WebSocket
    url: string

    constructor(url: string) {
        this.ws = new WebSocket(url)
        this.url = url
    }

    send(data: MaybeArray<Schema['body']>) {
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
                    const data = parseMessageEvent(ws as MessageEvent)

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
                    ...$headers
                } as Record<string, string>

                if (method !== 'GET' && method !== 'HEAD') {
                    body = Object.keys(bodyObj).length
                        ? bodyObj
                        : Array.isArray(bodyObj)
                        ? bodyObj
                        : undefined

                    const isObject =
                        body &&
                        (typeof body === 'object' || Array.isArray(bodyObj))
                    const isFormData = isObject && hasFile(body)

                    if (isFormData) {
                        const newBody = new FormData()

                        // Smart flatten: handles nested files with dot notation,
                        // stringifies file-less nested objects for TypeBox compatibility
                        const flattened = flattenObject(body)

                        for (const [key, value] of Object.entries(flattened)) {
                            if (value instanceof File) {
                                newBody.append(
                                    key,
                                    isServer
                                        ? value
                                        : await createNewFile(value)
                                )
                            } else if (
                                !isServer &&
                                // @ts-ignore
                                value instanceof FileList
                            ) {
                                // @ts-ignore
                                for (let i = 0; i < value.length; i++)
                                    newBody.append(
                                        key,
                                        await createNewFile(value[i])
                                    )
                            } else if (isFile(value)) {
                                // Handle Blob (isServer case)
                                newBody.append(key, value as any)
                            } else {
                                newBody.append(key, value as string)
                            }
                        }

                        body = newBody
                    } else {
                        if (body !== null && body !== undefined) {
                            headers['content-type'] = isObject
                                ? 'application/json'
                                : 'text/plain'

                            body = isObject ? JSON.stringify(body) : bodyObj
                        }
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

                let data

                if (modifiers.getRaw) return response as any
                switch (response.headers.get('Content-Type')?.split(';')[0]) {
                    case 'application/json':
                        data = await response.json()
                        break

                    default:
                        data = await response.text().then(parseStringifiedValue)
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

export const edenTreaty = <
    App extends Elysia<any, any, any, any, any, any, any>
>(
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
