/* eslint-disable no-extra-semi */
/* eslint-disable no-case-declarations */
/* eslint-disable prefer-const */
import type { Elysia } from 'elysia'
import type { Treaty } from './types'

import { EdenFetchError } from '../errors'
import { EdenWS } from './ws'
import { parseStringifiedDate, parseStringifiedValue } from '../utils/parse'
import type { ThrowHttpError } from '../types'

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

const shouldThrow = (
	error: EdenFetchError<number, unknown>,
	throwHttpError?: ThrowHttpError
): boolean => {
	if (typeof throwHttpError === 'function') return throwHttpError(error)
	return throwHttpError === true
}

const locals = ['localhost', '127.0.0.1', '0.0.0.0']

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

const processHeaders = async (
	h: Treaty.Config['headers'],
	path: string,
	options: RequestInit = {},
	headers: Record<string, string> = {}
): Promise<Record<string, string>> => {
	if (Array.isArray(h)) {
		for (const value of h)
			if (!Array.isArray(value))
				headers = await processHeaders(value, path, options, headers)
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
			if (h instanceof Headers)
				return processHeaders(h, path, options, headers)

			const v = await h(path, options)
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

			return headers

		default:
			return headers
	}
}

function parseSSEBlock(
	block: string,
	options?: { parseDate?: boolean }
): Record<string, unknown> | null {
	const lines = block.split('\n')
	const result: Record<string, unknown> = {}

	for (const line of lines) {
		if (!line || line.startsWith(':')) continue

		const colonIndex = line.indexOf(':')
		if (colonIndex > 0) {
			const key = line.slice(0, colonIndex).trim()
			// Per SSE spec, strip single leading space if present
			const value = line.slice(colonIndex + 1).replace(/^ /, '')
			// Preserve empty strings per SSE spec (e.g. "data:" with no value)
			result[key] = value ? parseStringifiedValue(value, options) : value
		}
	}

	return Object.keys(result).length > 0 ? result : null
}

/**
 * Extracts complete SSE events from buffer, yielding parsed events.
 * Mutates bufferRef.value to remove consumed events.
 */
function* extractEvents(
	bufferRef: {
		value: string
	},
	options?: { parseDate?: boolean }
): Generator<Record<string, unknown>> {
	let eventEnd: number
	while ((eventEnd = bufferRef.value.indexOf('\n\n')) !== -1) {
		const eventBlock = bufferRef.value.slice(0, eventEnd)
		bufferRef.value = bufferRef.value.slice(eventEnd + 2)

		if (eventBlock.trim()) {
			const parsed = parseSSEBlock(eventBlock, options)
			if (parsed) yield parsed
		}
	}
}

export async function* streamResponse(
	response: Response,
	options?: { parseDate?: boolean }
) {
	const body = response.body

	if (!body) return

	const reader = body.getReader()
	const decoder = new TextDecoder('utf-8')

	if (response.headers.get('Content-Type')?.startsWith('text/event-stream')) {
		const bufferRef = { value: '' }

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				const chunk =
					typeof value === 'string'
						? value
						: decoder.decode(value, { stream: true })

				bufferRef.value += chunk

				yield* extractEvents(bufferRef, options)
			}

			const remaining = decoder.decode()
			if (remaining) bufferRef.value += remaining

			yield* extractEvents(bufferRef, options)

			if (bufferRef.value.trim()) {
				const parsed = parseSSEBlock(bufferRef.value, options)
				if (parsed) yield parsed
			}
		} finally {
			reader.releaseLock()
		}
	} else {
		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				yield parseStringifiedValue(
					typeof value === 'string'
						? value
						: decoder.decode(value, { stream: true }),
					{
						parseDate: options?.parseDate
					}
				)
			}
		} finally {
			reader.releaseLock()
		}
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
			if (param === '~path') return '/' + paths.join('/')

			if (
				paths.length === 0 &&
				(param === 'then' || param === 'catch' || param === 'finally')
			)
				return undefined

			return createProxy(domain, config, [...paths, param], elysia)
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

				const query = isGetOrHead
					? (body as Record<string, string | string[] | undefined>)
							?.query
					: options?.query

				let q = ''
				if (query) {
					const append = (key: string, value: unknown) => {
						// Explicitly exclude null and undefined values from url encoding
						// to prevent parsing string "null" / string "undefined"
						if (value === undefined || value === null) return

						if (value instanceof Date) value = value.toISOString()

						q +=
							(q ? '&' : '?') +
							`${encodeURIComponent(key)}=${encodeURIComponent(
								typeof value === 'object'
									? JSON.stringify(value)
									: value + ''
							)}`
					}

					for (const [key, value] of Object.entries(query)) {
						if (Array.isArray(value)) {
							for (const v of value) append(key, v)

							continue
						}

						append(key, value)
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
					headers = await processHeaders(headers, path, options)

					let fetchInit = {
						method: method?.toUpperCase(),
						body,
						...conf,
						headers
					} satisfies RequestInit

					fetchInit.headers = {
						...headers,
						...(await processHeaders(
							// For GET and HEAD, options is moved to body (1st param)
							isGetOrHead ? body?.headers : options?.headers,
							path,
							fetchInit
						))
					}

					const fetchOpts =
						isGetOrHead && typeof body === 'object'
							? body.fetch
							: options?.fetch

					// Per-request throwHttpError overrides config
					const requestThrowHttpError =
						isGetOrHead && typeof body === 'object'
							? body.throwHttpError
							: options?.throwHttpError
					const resolvedThrowHttpError =
						requestThrowHttpError ?? config.throwHttpError

					fetchInit = {
						...fetchInit,
						...fetchOpts
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
										...(await processHeaders(
											temp.headers,
											path,
											fetchInit
										))
									}
								}
						}
					}

					// ? Duplicate because end-user might add a body in onRequest
					if (isGetOrHead) delete fetchInit.body

					if (hasFile(body)) {
						const formData = new FormData()

						const shouldStringify = (value: any): boolean => {
							if (typeof value === 'string') return false
							if (isFile(value)) return false

							// Objects and Arrays should be stringified
							if (typeof value === 'object') {
								if (value !== null) return true
								if (value instanceof Date) return false
							}

							return false
						}

						const prepareValue = async (
							value: any
						): Promise<any> => {
							if (value instanceof File)
								return await createNewFile(value)

							if (shouldStringify(value))
								return JSON.stringify(value)

							return value
						}

						// FormData is 1 level deep
						for (const [key, field] of Object.entries(
							fetchInit.body
						)) {
							if (Array.isArray(field)) {
								// Check if array contains non-file objects
								// If so, stringify the entire array (for t.ArrayString())
								// Otherwise, append each element separately (for t.Files())
								const hasNonFileObjects = field.some(
									(item) =>
										typeof item === 'object' &&
										item !== null &&
										!isFile(item)
								)

								if (hasNonFileObjects) {
									// ArrayString case: stringify the whole array
									formData.append(
										key as any,
										JSON.stringify(field)
									)
								} else {
									// Files case: append each element separately
									for (let i = 0; i < field.length; i++) {
										const value = (field as any)[i]
										const preparedValue =
											await prepareValue(value)

										formData.append(
											key as any,
											preparedValue
										)
									}
								}

								continue
							}

							if (isServer) {
								if (Array.isArray(field))
									for (const f of field) {
										formData.append(
											key,
											await prepareValue(f)
										)
									}
								else
									formData.append(
										key,
										await prepareValue(field)
									)

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

							formData.append(key, await prepareValue(field))
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
										...(await processHeaders(
											temp.headers,
											path,
											fetchInit
										))
									} as Record<string, string>
								}
						}
					}

					if (options?.headers?.['content-type'])
						// @ts-ignore
						fetchInit.headers['content-type'] =
							options?.headers['content-type']

					const url = domain + path + q

					let response: Response

					try {
						response = await (elysia?.handle(
							new Request(url, fetchInit)
						) ?? fetcher!(url, fetchInit))
					} catch (err) {
						const error = new EdenFetchError(503, err)
						if (shouldThrow(error, resolvedThrowHttpError))
							throw error
						return {
							data: null,
							error,
							response: undefined,
							status: 503,
							headers: undefined
						}
					}

					// @ts-ignore
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

					if (data !== null) {
						return {
							data,
							error,
							response,
							status: response.status,
							headers: response.headers
						}
					}

					switch (
						response.headers.get('Content-Type')?.split(';')[0]
					) {
						case 'text/event-stream':
							data = streamResponse(response, {
								parseDate: config.parseDate
							})
							break

						case 'application/json':
							data = JSON.parse(await response.text(), (k, v) => {
								if (typeof v !== 'string') return v

								const date = parseStringifiedDate(v, {
									parseDate: config.parseDate
								})
								if (date) return date

								return v
							})
							break

						case 'application/octet-stream':
							data = await response.arrayBuffer()
							break

						case 'multipart/form-data':
							const temp = (await response.formData()) as FormData

							data = {}
							temp.forEach((value, key) => {
								// @ts-ignore
								data[key] = value
							})

							break

						default:
							if (
								response.headers
									.get('content-type')
									?.startsWith('text/') &&
								!response.headers.has('content-length')
							)
								data = streamResponse(response, {
									parseDate: config.parseDate
								})
							else
								data = await response.text().then((text) =>
									parseStringifiedValue(text, {
										parseDate: config.parseDate
									})
								)
					}

					if (response.status >= 300 || response.status < 200) {
						error = new EdenFetchError(response.status, data)
						if (shouldThrow(error, resolvedThrowHttpError))
							throw error
						data = null
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
	const App extends Elysia<any, any, any, any, any, any, any>,
	Head extends {} = {}
>(
	domain: string | App,
	config: Treaty.Config<Head> = {}
): Treaty.Create<App, Head> => {
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
