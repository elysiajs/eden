import type { LegacyEdenCall } from './types'

export const camelToDash = (str: string) =>
    str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

export const composePath = (
    domain: string,
    path: string,
    query: LegacyEdenCall['$query'] | undefined
) => {
    if (!domain.endsWith('/')) domain += '/'
    path = camelToDash(path.replace(/index/g, ''))

    if (!query || !Object.keys(query).length) return `${domain}${path}`

    let q = ''
    for (const [key, value] of Object.entries(query)) q += `${key}=${value}&`

    return `${domain}${path}?${q.slice(0, -1)}`
}
