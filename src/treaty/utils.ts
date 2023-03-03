export const composePath = (
    domain: string,
    path: string,
    query: Record<string, string> | undefined
) => {
    if (!domain.endsWith('/')) domain += '/'

    if (!query || !Object.keys(query).length) return `${domain}${path}`

    let q = ''
    for (const [key, value] of Object.entries(query)) q += `${key}=${value}&`

    return `${domain}${path}?${q.slice(0, -1)}`
}
