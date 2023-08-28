import type { Elysia } from 'elysia'

import { EdenFetchError } from '../utils'
import type { EdenFetch } from './types'
export type { EdenFetch } from './types'

export const edenFetch =
    <App extends Elysia<any, any>>(
        server: string,
        config?: EdenFetch.Config
    ): EdenFetch.Create<App> =>
    // @ts-ignore
    async (endpoint: string, { params, body, query, ...options } = {}) => {
        if (params)
            Object.entries(params).forEach(([key, value]) => {
                endpoint = endpoint.replace(`:${key}`, value)
            })

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
        return fetch(server + endpoint + queryStr, {
            ...options,
            headers: body
                ? {
                      'content-type': 'application/json',
                      ...options.headers
                  }
                : options.headers,
            body: body as any
        }).then(async (res) => {
            let data

            switch (res.headers.get('Content-Type')?.split(';')[0]) {
                case 'application/json':
                    data = await res.json()
                    break

                default:
                    data = await res.text().then((d) => {
                        if (!Number.isNaN(+d)) return +d
                        if (d === 'true') return true
                        if (d === 'false') return false

                        return d
                    })
                    break
            }

            if (res.status > 300)
                return {
                    data: null,
                    error: new EdenFetchError(res.status, data)
                }

            return { data, error: null }
        })
    }
