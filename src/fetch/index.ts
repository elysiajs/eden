import type { Elysia } from 'elysia'

import { EdenFetchError } from '../errors'
import type { EdenFetch } from './types'
import { parseStringifiedValue } from '../utils/parsingUtils'

export type { EdenFetch } from './types'

export const edenFetch =
    <App extends Elysia<any, any, any, any, any, any, any, any>>(
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
            }).then(async (response) => {
                // @ts-ignore
                let data

                switch (response.headers.get('Content-Type')?.split(';')[0]) {
                    case 'application/json':
                        data = await response.json()
                        break

                    case 'application/octet-stream':
                        data = await response.arrayBuffer()
                        break

                    case 'multipart/form-data':
                        const temp = await response.formData()

                        data = {}
                        temp.forEach((value, key) => {
                            // @ts-ignore
                            data[key] = value
                        })

                        break

                    default:
                        data = await response.text().then(parseStringifiedValue)
                }

                if (response.status > 300)
                    return {
                        data: null,
                        status: response.status,
                        headers: response.headers,
                        retry: execute,
                        error: new EdenFetchError(response.status, data)
                    }

                return {
                    data,
                    error: null,
                    status: response.status,
                    headers: response.headers,
                    retry: execute
                }
            })

        return execute()
    }
