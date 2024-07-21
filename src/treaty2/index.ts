/* eslint-disable no-extra-semi */
/* eslint-disable no-case-declarations */
/* eslint-disable prefer-const */
import type { Elysia } from 'elysia'
import { EventSourceParserStream } from 'eventsource-parser/stream'

import type { Treaty } from './types'

import { EdenFetchError } from '../errors'
import { EdenWS } from './ws'
import { parseStringifiedValue } from '../utils/parsingUtils'

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
			if (h instanceof Headers)
				return processHeaders(h, path, options, headers)

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

			return headers

		default:
			return headers
	}
}

interface SSEEvent {
    event: string;
    data: any;
    id?: string;
}


export class TextDecoderStream extends TransformStream<Uint8Array, string> {
    constructor() {
        const decoder = new TextDecoder('utf-8', {
            fatal: true,
            ignoreBOM: true
        })
        super({
            transform(
                chunk: Uint8Array,
                controller: TransformStreamDefaultController<string>
            ) {
                const decoded = decoder.decode(chunk, { stream: true })
                if (decoded.length > 0) {
                    controller.enqueue(decoded)
                }
            },
            flush(controller: TransformStreamDefaultController<string>) {
                const output = decoder.decode()
                if (output.length > 0) {
                    controller.enqueue(output)
                }
            }
        })
    }
}

export async function* streamResponse(
    response: Response
): AsyncGenerator<SSEEvent> {
    const body = response.body
    if (!body) return

    const eventStream = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream())

    let reader = eventStream.getReader()
    try {
        while (true) {
            const { done, value: event } = await reader.read()
            if (done) break
            if (event?.event === 'error') {
                throw new EdenFetchError(500, event.data)
            }
            if (event) {
                yield tryParsingJson(event.data)
            }
        }
    } finally {
        reader.releaseLock()
    }
}


function tryParsingJson(data: string): any {
	try {
		return JSON.parse(data)
	} catch (error) {
		return null
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
									} as Record<string, string>
								}
						}
					}

					const url = domain + path + q
					const response = await (elysia?.handle(
						new Request(url, fetchInit)
					) ?? fetcher!(url, fetchInit))

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
							data = streamResponse(response)
							break

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
							data = await response
								.text()
								.then(parseStringifiedValue)
					}

					if (response.status >= 300 || response.status < 200) {
						error = new EdenFetchError(response.status, data)
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
