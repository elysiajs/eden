/* eslint-disable prefer-const */
import type { Elysia } from 'elysia'
import type { EdenTreaty2 } from './types'

import { isNumericString } from '../treaty/utils'
import { EdenFetchError } from '../errors'
import { EdenWS } from './ws'

const method = [
    'get',
    'post',
    'put',
    'delete',
    'patch',
    'options',
    'head',
    'connect',
    'subscribe'
] as const

const isServer = typeof FileList === 'undefined'

const isFile = (v: any) => {
    if (isServer) return v instanceof Blob

    return v instanceof FileList || v instanceof File
}

// FormData is 1 level deep
const hasFile = (obj: Record<string, any>) => {
    if (!obj) return false

    for (const key in obj) {
        if (isFile(obj[key])) return true

        if (Array.isArray(obj[key]) && (obj[key] as unknown[]).find(isFile))
            return true
    }

    return false
}

const createNewFile = (v: File) =>
    isServer
        ? v
        : new Promise<File>((resolve) => {
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

const createProxy = (
    domain: string,
    config: EdenTreaty2.Config,
    paths: string[] = [],
    elysia?: Elysia<any, any, any, any, any, any>
): any =>
    new Proxy(() => {}, {
        get(_, param: string): any {
            return createProxy(domain, config, [...paths, param], elysia)
        },
        apply(_, __, [body, options]) {
            if (
                !body ||
                options ||
                (typeof body === 'object' && Object.keys(body).length !== 1) ||
                method.includes(paths.at(-1) as any)
            )
                return (async () => {
                    const method = paths.pop()
                    const path = '/' + paths.join('/')

                    if (method === 'subscribe')
                        return new EdenWS(
                            domain.replace(
                                /^([^]+):\/\//,
                                domain.startsWith('https://')
                                    ? 'wss://'
                                    : 'ws://'
                            ) + path
                        )

                    let {
                        fetcher = fetch,
                        headers,
                        onRequest,
                        onResponse,
                        ...conf
                    } = config

                    if (
                        typeof headers === 'function' &&
                        !(headers instanceof Headers)
                    )
                        headers = headers(path, options) ?? undefined
                    else if (
                        Array.isArray(headers) &&
                        headers.every((x) => typeof x === 'function')
                    )
                        for (const value of headers as Function[])
                            headers = value(path, options) ?? undefined
                    else if (headers instanceof Headers) {
                        headers = {}

                        for (const [key, value] of Object.entries(headers))
                            headers[key] = value
                    }

                    let contentType: string =
                        (headers instanceof Headers
                            ? headers.get('content-type')
                            : Array.isArray(headers)
                            ? headers.find((x) => {
                                  if (Array.isArray(x))
                                      if (x[0] === 'headers') return x[1]

                                  return false
                              })
                            : typeof headers === 'function'
                            ? headers(path, options)
                            : headers?.contentType) ||
                        options?.headers?.contentType

                    if (!contentType)
                        if (typeof body === 'object') {
                            contentType = 'application/json'

                            body = JSON.stringify(body)
                        } else if (hasFile(body)) {
                            const formData = new FormData()

                            // FormData is 1 level deep
                            for (const [key, field] of Object.entries(body)) {
                                if (isServer) {
                                    formData.append(key, field as any)

                                    continue
                                }

                                if (field instanceof File) {
                                    formData.append(
                                        key,
                                        await createNewFile(field as any)
                                    )

                                    continue
                                }

                                if (field instanceof FileList) {
                                    for (let i = 0; i < field.length; i++)
                                        formData.append(
                                            key as any,
                                            await createNewFile(
                                                (field as any)[i]
                                            )
                                        )

                                    continue
                                }

                                if (Array.isArray(field)) {
                                    for (let i = 0; i < field.length; i++) {
                                        const value = (field as any)[i]

                                        formData.append(
                                            key as any,
                                            value instanceof File
                                                ? await createNewFile(value)
                                                : value
                                        )
                                    }

                                    continue
                                }

                                formData.append(key, field as string)
                            }

                            body = formData
                        } else contentType = 'text/plain'

                    const fetchInit = {
                        method,
                        body,
                        ...conf,
                        headers: {
                            ...(headers as Record<string, string>),
                            'content-type': contentType
                        }
                    } satisfies FetchRequestInit

                    if (onRequest) {
                        if (!Array.isArray(onRequest)) onRequest = [onRequest]

                        for (const value of onRequest) {
                            const temp = await value(path, fetchInit)

                            if (typeof temp === 'object')
                                Object.assign(fetchInit, temp)
                        }
                    }

                    const response = await (elysia?.handle(
                        new Request(domain + path, fetchInit)
                    ) ?? fetcher!(domain + path, fetchInit))

                    let data
                    let error

                    if (onResponse) {
                        if (!Array.isArray(onResponse))
                            onResponse = [onResponse]

                        for (const value of onResponse)
                            try {
                                data = await value(response.clone())

                                if (data !== undefined) break
                            } catch (err) {
                                if (err instanceof EdenFetchError) error = err
                                else error = new EdenFetchError(500, err)

                                break
                            }
                    }

                    if (data === undefined) {
                        if (response.status >= 300 || response.status < 200)
                            new EdenFetchError(response.status, data)
                        else
                            switch (
                                response.headers
                                    .get('Content-Type')
                                    ?.split(';')[0]
                            ) {
                                case 'application/json':
                                    data = await response.json()
                                    break

                                case 'application/octet-stream':
                                    data = await response.arrayBuffer()
                                    break

                                default:
                                    data = await response
                                        .text()
                                        .then((data) => {
                                            if (isNumericString(data))
                                                return +data
                                            if (data === 'true') return true
                                            if (data === 'false') return false

                                            return data
                                        })
                            }
                    }

                    const result = {
                        data,
                        error,
                        response,
                        status: response.status,
                        headers: response.headers
                    }

                    return result
                })()

            if (typeof body === 'object')
                return createProxy(
                    domain,
                    config,
                    [...paths, Object.values(body)[0] as string],
                    elysia
                )

            return createProxy(domain, config, paths)
        }
    }) as any

export const treaty = <const App extends Elysia<any, any, any, any, any, any>>(
    domain: string | App,
    config: EdenTreaty2.Config = {}
): EdenTreaty2.Create<App> => {
    if (typeof domain === 'string') {
        if (!domain.includes('://'))
            domain =
                (['localhost', '127.0.0.1', '0.0.0.0'].find((v) =>
                    (domain as string).includes(v)
                )
                    ? 'http://'
                    : 'https://') + domain

        if (domain.endsWith('/')) domain = domain.slice(0, -1)

        return createProxy(domain, config)
    }

    if (typeof window !== 'undefined')
        console.warn(
            'Elysia instance server found on client side, this is not recommended for security reason. Use generic type instead.'
        )

    return createProxy('http://e.ly', config, [], domain)
}

export type { EdenTreaty2 }
