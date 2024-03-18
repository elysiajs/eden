/* eslint-disable prefer-const */
import type { Elysia } from 'elysia'
import type { Treaty } from './types'

import { composePath, isNumericString } from '../treaty/utils'
import { EdenFetchError } from '../errors'
import { EdenWS } from './ws'
import { subscribe } from 'diagnostics_channel'

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

const locals = ['localhost', '127.0.0.1', '0.0.0.0']

const isServer = typeof FileList === 'undefined'

const isISO8601 =
    /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/
const isFormalDate =
    /(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2}\s\d{4}\s\d{2}:\d{2}:\d{2}\sGMT(?:\+|-)\d{4}\s\([^)]+\)/
const isShortenDate =
    /^(?:(?:(?:(?:0?[1-9]|[12][0-9]|3[01])[/\s-](?:0?[1-9]|1[0-2])[/\s-](?:19|20)\d{2})|(?:(?:19|20)\d{2}[/\s-](?:0?[1-9]|1[0-2])[/\s-](?:0?[1-9]|[12][0-9]|3[01]))))(?:\s(?:1[012]|0?[1-9]):[0-5][0-9](?::[0-5][0-9])?(?:\s[AP]M)?)?$/

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
    config: Treaty.Config,
    paths: string[] = [],
    elysia?: Elysia<any, any, any, any, any, any>
): any =>
    new Proxy(() => {}, {
        get(_, param: string): any {
            return createProxy(
                domain,
                config,
                param === 'index' ? paths : [...paths, param],
                elysia
            )
        },
        apply(_, __, [body, options]) {
            if (
                !body ||
                options ||
                (typeof body === 'object' && Object.keys(body).length !== 1) ||
                method.includes(paths.at(-1) as any)
            ) {
                const method = paths.pop()
                const path = '/' + paths.join('/')

                let {
                    fetcher = fetch,
                    headers,
                    onRequest,
                    onResponse,
                    fetch: conf
                } = config

                const isGetOrHead =
                    method === 'get' ||
                    method === 'head' ||
                    method === 'subscribe'

                headers = {
                    ...(typeof headers === 'object' && !Array.isArray(headers)
                        ? headers
                        : {}),
                    ...(isGetOrHead ? body?.headers : options?.headers)
                }

                const query = isGetOrHead
                    ? (body as Record<string, string>)?.query
                    : options?.query

                let q = ''
                if (query)
                    for (const [key, value] of Object.entries(query))
                        q += (q ? '&' : '?') + `${key}=${value}`

                if (
                    typeof config.headers === 'function' &&
                    !(headers instanceof Headers)
                ) {
                    const temp = config.headers(path, options ?? {})

                    if (temp) {
                        // @ts-expect-error
                        headers = {
                            ...headers,
                            ...temp
                        }
                    }
                } else if (
                    Array.isArray(config.headers) &&
                    config.headers.every((x) => typeof x === 'function')
                )
                    for (const value of config.headers as Function[]) {
                        const temp = value(path, options ?? {})

                        if (temp)
                            headers = {
                                ...headers,
                                ...temp
                            }
                    }
                else if (headers instanceof Headers) {
                    if (!headers) headers = {}

                    for (const [key, value] of Object.entries(headers)) {
                        // @ts-expect-error
                        headers[key] = value
                    }
                }

                if (method === 'subscribe') {
                    const url =
                        domain.replace(
                            /^([^]+):\/\//,
                            domain.startsWith('https://')
                                ? 'wss://'
                                : domain.startsWith('http://')
                                ? 'ws://'
                                : locals.find((v) =>
                                      (domain as string).includes(v)
                                  )
                                ? 'ws://'
                                : 'wss://'
                        ) +
                        path +
                        q

                    return new EdenWS(url)
                }

                return (async () => {
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
                            ? headers(path, options ?? {})
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
                        } else if (body !== undefined && body !== null)
                            contentType = 'text/plain'

                    let fetchInit = {
                        method: method?.toUpperCase(),
                        body,
                        ...conf,
                        headers: {
                            ...(headers as Record<string, string>),
                            'content-type': contentType
                        }
                    } satisfies FetchRequestInit

                    if (isGetOrHead) delete fetchInit.body

                    if (onRequest) {
                        if (!Array.isArray(onRequest)) onRequest = [onRequest]

                        for (const value of onRequest) {
                            const temp = await value(path, fetchInit)

                            if (typeof temp === 'object')
                                fetchInit = {
                                    ...fetchInit,
                                    ...temp,
                                    headers: {
                                        ...fetchInit.headers,
                                        ...temp.headers
                                    }
                                }
                        }
                    }

                    const url = domain + path + q

                    const response = await (elysia?.handle(
                        new Request(url, fetchInit)
                    ) ?? fetcher!(url, fetchInit))

                    let data = null
                    let error

                    if (onResponse) {
                        if (!Array.isArray(onResponse))
                            onResponse = [onResponse]

                        for (const value of onResponse)
                            try {
                                data = await value(response.clone())

                                if (data !== undefined && data !== null) break
                            } catch (err) {
                                if (err instanceof EdenFetchError) error = err
                                else error = new EdenFetchError(422, err)

                                break
                            }
                    }

                    if (data === null) {
                        switch (
                            response.headers.get('Content-Type')?.split(';')[0]
                        ) {
                            case 'application/json':
                                data = await response.json()
                                break

                            case 'application/octet-stream':
                                data = await response.arrayBuffer()
                                break

                            default:
                                data = await response.text().then((data) => {
                                    if (isNumericString(data)) return +data
                                    if (data === 'true') return true
                                    if (data === 'false') return false

                                    if (!data) return data

                                    // Remove quote from stringified date
                                    const temp = data.replace(/"/g, '')

                                    if (
                                        isISO8601.test(temp) ||
                                        isFormalDate.test(temp) ||
                                        isShortenDate.test(temp)
                                    ) {
                                        const date = new Date(temp)
                                        if (!Number.isNaN(date.getTime()))
                                            return date
                                    }

                                    return data
                                })
                        }

                        if (response.status >= 300 || response.status < 200) {
                            error = new EdenFetchError(response.status, data)
                            data = null
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
            }

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

export const treaty = <
    const App extends Elysia<any, any, any, any, any, any, any, any>
>(
    domain: string | App,
    config: Treaty.Config = {}
): Treaty.Create<App> => {
    if (typeof domain === 'string') {
        if (!domain.includes('://'))
            domain =
                (locals.find((v) => (domain as string).includes(v))
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

export type { Treaty }
