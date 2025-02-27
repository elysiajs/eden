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

        const contentType = options.headers?.['Content-Type']

        if (!contentType || contentType === 'application/json')
            try {
                body = JSON.stringify(body)
            } catch (error) {}

        const fetch = config?.fetcher || globalThis.fetch

        const nonNullishQuery = query
            ? Object.fromEntries(
                  Object.entries(query).filter(
                      ([_, val]) => val !== undefined && val !== null
                  )
              )
            : null
        const queryStr = nonNullishQuery
            ? `?${new URLSearchParams(nonNullishQuery).toString()}`
            : ''

        const requestUrl = `${server}${endpoint}${queryStr}`
        const headers = body
            ? {
                  'content-type': 'application/json',
                  ...options.headers
              }
            : options.headers
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
