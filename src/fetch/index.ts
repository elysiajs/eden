import type { Elysia } from 'elysia'

import { EdenFetchError } from '../errors'
import type { EdenFetch } from './types'
import { isNumericString } from '../treaty/utils'
export type { EdenFetch } from './types'

export const edenFetch =
    <App extends Elysia<any, any, any, any, any, any>>(
        server: string,
        config?: EdenFetch.Config
    ): EdenFetch.Create<App> =>
    // @ts-ignore
    (endpoint: string, { query, params, body, ...options } = {}) => {
        if (params)
            Object.entries(params).forEach(([key, value]) => {
                endpoint = endpoint.replace(`:${key}`, value as string)
            })

        // @ts-ignore
        const contentType = options.headers?.['Content-Type']

        if (!contentType || contentType === 'application/json')
            try {
                body = JSON.stringify(body)
            } catch (error) {
                //
            }

        const fetch = config?.fetcher || globalThis.fetch
        const queryStr = query
            ? `?${new URLSearchParams(query).toString()}`
            : ''

        // @ts-ignore
        const execute = () =>
            fetch(server + endpoint + queryStr, {
                ...options,
                // @ts-ignore
                method: options.method?.toUpperCase() || 'GET',
                headers: body
                    ? {
                          'content-type': 'application/json',
                          // @ts-ignore
                          ...options.headers
                      }
                    : // @ts-ignore
                      options.headers,
                body: body as any
            }).then(async (res) => {
                let data

                switch (res.headers.get('Content-Type')?.split(';')[0]) {
                    case 'application/json':
                        data = await res.json()
                        break

                    default:
                        data = await res.text().then((d) => {
                            if (isNumericString(d)) return parseInt(d)
                            if (d === 'true') return true
                            if (d === 'false') return false

                            return d
                        })
                        break
                }

                if (res.status > 300)
                    return {
                        data: null,
                        status: res.status,
                        headers: res.headers,
                        retry: execute,
                        error: new EdenFetchError(res.status, data)
                    }

                return {
                    data,
                    error: null,
                    status: res.status,
                    headers: res.headers,
                    retry: execute
                }
            })

        return execute()
    }
