import type { Elysia } from 'elysia'

import { EdenFetchError } from '../errors'
import type { EdenFetch } from './types'
import { parseStringifiedValue } from '../utils/parsingUtils'
import { ThrowHttpErrors } from '../types'

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

const shouldThrow = (
	error: EdenFetchError<number, unknown>,
	throwHttpErrors?: ThrowHttpErrors
): boolean => {
	if (typeof throwHttpErrors === 'function') return throwHttpErrors(error)
	return throwHttpErrors === true
}

const handleResponse = async (
	response: Response,
	retry: () => any,
	throwHttpErrors?: ThrowHttpErrors
) => {
	const data = await parseResponse(response)

	if (response.status >= 300 || response.status < 200) {
		const error = new EdenFetchError(response.status, data)
		if (shouldThrow(error, throwHttpErrors)) throw error
		return {
			data: null,
			status: response.status,
			headers: response.headers,
			retry,
			error
		}
	}

	return {
		data,
		error: null,
		status: response.status,
		headers: response.headers,
		retry
	}
}

export const edenFetch = <App extends Elysia<any, any, any, any, any, any, any>>(
		server: string,
		config?: EdenFetch.Config
	): EdenFetch.Create<App> =>
	// @ts-ignore
	(endpoint: string, { query, params, body, throwHttpErrors: requestThrowHttpErrors, ...options } = {}) => {
		if (params)
			Object.entries(params).forEach(([key, value]) => {
				endpoint = endpoint.replace(`:${key}`, value as string)
			})

		const fetch = config?.fetcher || globalThis.fetch
		// Per-request throwHttpErrors overrides config
		const resolvedThrowHttpErrors = requestThrowHttpErrors ?? config?.throwHttpErrors

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
			// @ts-ignore
			method: options.method?.toUpperCase() || 'GET',
			headers,
			body: body as any
		}

	const execute = () =>
		fetch(requestUrl, init)
			.then((response) => handleResponse(response, execute, resolvedThrowHttpErrors))
			.catch((err) => {
				if (err instanceof EdenFetchError) throw err
				const error = new EdenFetchError(503, err)
				if (shouldThrow(error, resolvedThrowHttpErrors)) throw error
				return {
					data: null,
					error,
					status: 503,
					headers: undefined,
					retry: execute
				}
			})

	return execute()
}
