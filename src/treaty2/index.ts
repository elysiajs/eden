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

const processHeaders = (
    h: Treaty.Config['headers'],
    path: string,
    options: RequestInit = {},
    headers: Record<string, string> = {}
): Record<string, string> => {
    if (Array.isArray(h)) {
        for (const value of h)
            if (!Array.isArray(value))
                headers = processHeaders(value, path, options, headers)
            else {
                const key = value[0]
                if (typeof key === 'string')
                    headers[key.toLowerCase()] = value[1] as string
                else
                    for (const [k, value] of key)
                        headers[k.toLowerCase()] = value as string
            }

        return headers
    }

    if (!h) return headers

    switch (typeof h) {
        case 'function':
            const v = h(path, options)
            if (v) return processHeaders(v, path, options, headers)
            return headers

        case 'object':
            if (h instanceof Headers) {
                h.forEach((value, key) => {
                    headers[key.toLowerCase()] = value
                })
                return headers
            }

            for (const [key, value] of Object.entries(h))
                headers[key.toLowerCase()] = value as string

        default:
            return headers
    }
}

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
                const methodPaths = [...paths]
                const method = methodPaths.pop()
                const path = '/' + methodPaths.join('/')

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

                headers = processHeaders(headers, path, options)

                const query = isGetOrHead
                    ? (body as Record<string, string | string[] | undefined>)
                          ?.query
                    : options?.query

                let q = ''
                if (query) {
                    const append = (key: string, value: string) => {
                        q +=
                            (q ? '&' : '?') +
                            `${encodeURIComponent(key)}=${encodeURIComponent(
                                value
                            )}`
                    }

                    for (const [key, value] of Object.entries(query)) {
                        if (Array.isArray(value)) {
                            for (const v of value) append(key, v)
                            continue
                        }

                        append(key, `${value}`)
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
                    let fetchInit = {
                        method: method?.toUpperCase(),
                        body,
                        ...conf,
                        headers
                    } satisfies FetchRequestInit

                    fetchInit.headers = {
                        ...headers,
                        ...processHeaders(
                            // For GET and HEAD, options is moved to body (1st param)
                            isGetOrHead ? body?.headers : options?.headers,
                            path,
                            fetchInit
                        )
                    }

                    const fetchOpts =
                        isGetOrHead && typeof body === 'object'
                            ? body.fetch
                            : options?.fetch

                    fetchInit = {
                        ...fetchInit,
                        ...fetchOpts
                    }

                    if (isGetOrHead) delete fetchInit.body

                    if (hasFile(body)) {
                        const formData = new FormData()

                        // FormData is 1 level deep
                        for (const [key, field] of Object.entries(
                            fetchInit.body
                        )) {
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
                                        await createNewFile((field as any)[i])
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

                    // We don't do this because we need to let the browser set the content type with the correct boundary
                    // fetchInit.headers['content-type'] = 'multipart/form-data'
                    fetchInit.body = formData
                    } else if (typeof body === 'object') {
                        ;(fetchInit.headers as Record<string, string>)[
                            'content-type'
                        ] = 'application/json'

                        fetchInit.body = JSON.stringify(body)
                    } else if (body !== undefined && body !== null) {
                        ;(fetchInit.headers as Record<string, string>)[
                            'content-type'
                        ] = 'text/plain'
                    }

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
                                        ...processHeaders(
                                            temp.headers,
                                            path,
                                            fetchInit
                                        )
                                    }
                                }
                        }
                    }

                    // ? Duplicate because end-user might add a body in onRequest
                    if (isGetOrHead) delete fetchInit.body

                    const url = domain + path + q
                    const response = await (elysia?.handle(
                        new Request(url, fetchInit)
                    ) ?? fetcher!(url, fetchInit))

                    let data = null
                    let error = null

                    if (onResponse) {
                        if (!Array.isArray(onResponse))
                            onResponse = [onResponse]

                        for (const value of onResponse)
                            try {
                                const temp = await value(response.clone())

                                if (temp !== undefined && temp !== null) {
                                    data = temp
                                    break
                                }
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

                    return {
                        data,
                        error,
                        response,
                        status: response.status,
                        headers: response.headers
                    }
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
        if (!config.keepDomain) {
            if (!domain.includes('://'))
                domain =
                    (locals.find((v) => (domain as string).includes(v))
                        ? 'http://'
                        : 'https://') + domain

            if (domain.endsWith('/')) domain = domain.slice(0, -1)
        }

        return createProxy(domain, config)
    }

    if (typeof window !== 'undefined')
        console.warn(
            'Elysia instance server found on client side, this is not recommended for security reason. Use generic type instead.'
        )

    return createProxy('http://e.ly', config, [], domain)
}

export type { Treaty }
