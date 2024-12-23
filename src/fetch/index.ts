import type { Elysia } from 'elysia'

import { EdenFetchError } from '../errors'
import type { EdenFetch } from './types'
import { parseStringifiedValue } from '../utils/parsingUtils'

export type { EdenFetch } from './types'

const parseResponse = async (response: Response) => {
    const contentType = response.headers.get('Content-Type')?.split(';')[0]

    switch (contentType) {
        case 'application/json':
            return response.json()
        case 'application/octet-stream':
            return response.arrayBuffer()
        case 'multipart/form-data': {
            const formData = await response.formData()

            const data = {}
            formData.forEach((value, key) => {
                // @ts-ignore
                data[key] = value
            })

            return data
        }
    }

    return response.text().then(parseStringifiedValue)
}

const handleResponse = async (response: Response, retry: () => any) => {
    const data = await parseResponse(response)

    if (response.status > 300)
        return {
            data: null,
            status: response.status,
            headers: response.headers,
            retry,
            error: new EdenFetchError(response.status, data)
        }

    return {
        data,
        error: null,
        status: response.status,
        headers: response.headers,
        retry
    }
}

export const edenFetch =
    <App extends Elysia<any, any, any, any, any, any, any>>(
        server: string,
        config?: EdenFetch.Config
    ): EdenFetch.Create<App> =>
    // @ts-ignore
    (endpoint: string, { query, params, body, ...options } = {}) => {
        if (params)
            Object.entries(params).forEach(([key, value]) => {
                endpoint = endpoint.replace(`:${key}`, value as string)
            })

        const fetch = config?.fetcher || globalThis.fetch
        const queryStr = query
            ? `?${new URLSearchParams(query).toString()}`
            : ''
        const requestUrl = `${server}${endpoint}${queryStr}`
        const headers = new Headers(options.headers || {})
        const contentType = headers.get('content-type')
        if (
            !(body instanceof FormData) &&
            !(body instanceof URLSearchParams) &&
            (!contentType || contentType === 'application/json')
        ) {
            try {
                body = JSON.stringify(body)
                if (!contentType) headers.set('content-type', 'application/json')
            } catch (error) {}
        }

        const init = {
            ...options,
            method: options.method?.toUpperCase() || 'GET',
            headers,
            body: body as any
        }

        const execute = () =>
            fetch(requestUrl, init).then((response) =>
                handleResponse(response, execute)
            )

        return execute()
    }
