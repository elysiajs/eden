import type { Elysia } from 'elysia'
import type { HTTPMethod } from 'elysia'

import { CreateEden, Eden, EdenCall, UnionToIntersection } from './types'

const camelToDash = (str: string) =>
    str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

const composePath = (
    domain: string,
    path: string,
    query: EdenCall['$query'] | undefined
) => {
    if (!domain.endsWith('/')) domain += '/'
    path = camelToDash(path.replace(/index/g, ''))

    if (!query || !Object.keys(query).length) return `${domain}${path}`

    let q = ''
    for (const [key, value] of Object.entries(query)) q += `${key}=${value}&`

    return `${domain}${path}?${q.slice(0, -1)}`
}

const createProxy = (
    domain: string,
    path: string = ''
): Record<string, unknown> =>
    new Proxy(() => {}, {
        get(target, key, value) {
            return createProxy(domain, `${path}/${key.toString()}`)
        },
        apply(
            target,
            _,
            [
                { $query, $fetch, ...body } = {
                    $fetch: undefined,
                    $query: undefined
                }
            ]: EdenCall[] = [{}]
        ) {
            const i = path.lastIndexOf('/')

            return fetch(composePath(domain, path.slice(0, i), $query), {
                method: path.slice(i + 1),
                headers: {
                    'content-type': 'application/json',
                    ...$fetch?.['headers']
                },
                body: Object.keys(body).length
                    ? JSON.stringify(body)
                    : undefined,
                ...$fetch
            }).then(async (res) => {
                if (res.status >= 300) throw new Error(await res.text())

                if (res.headers.get('content-type') === 'application/json')
                    return res.json()

                return res.text()
            })
        }
    }) as unknown as Record<string, unknown>

export const eden = <App extends Elysia<any>>(domain: string): Eden<App> =>
    new Proxy(
        {},
        {
            get(target, key, value) {
                return createProxy(domain, key as string)
            }
        }
    ) as any
