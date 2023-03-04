import type { Elysia } from 'elysia'

import { EdenFetchError } from '../utils'
import type { EdenFetch } from './types'
export type { EdenFetch } from './types'

export const edenFetch =
    <App extends Elysia<any>>(
        server: string,
        config?: EdenFetch.Config
    ): EdenFetch.Create<App> =>
    // @ts-ignore
    async (endpoint: string, { params, body, ...options } = {}) => {
        if (params)
            Object.entries(params).forEach(([key, value]) => {
                endpoint = endpoint.replace(`:${key}`, value)
            })

        const contentType = options.headers?.['Content-Type']

        if (!contentType || contentType === 'application/json')
            body = JSON.stringify(body)

        // @ts-ignore
        return fetch(server + endpoint, {
            ...options,
            headers: {
                'content-type': 'application/json',
                ...options.headers
            },
            body
        }).then(async (res) => {
            let data: Promise<unknown>

            switch (res.headers.get('Content-Type')?.split(';')[0]) {
                case 'application/json':
                    data = res.json()
                    break

                default:
                    data = res.text().then((data) => {
                        if (!Number.isNaN(+data)) return +data
                        if (data === 'true') return true
                        if (data === 'false') return false

                        return data
                    })
            }

            if (res.status > 300)
                return new EdenFetchError(res.status, await data)

            return data
        })
    }
