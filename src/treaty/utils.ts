export const composePath = (
    domain: string,
    path: string,
    query: Record<string, string> | undefined
) => {
    if (!domain.endsWith('/')) domain += '/'
    if (path === 'index') path = ''

    if (!query || !Object.keys(query).length) return `${domain}${path}`

    let q = ''
    for (const [key, value] of Object.entries(query)) q += `${key}=${value}&`

    return `${domain}${path}?${q.slice(0, -1)}`
}

export const isNumericString = (message: string) =>
    message.trim().length !== 0 && !Number.isNaN(Number(message))
