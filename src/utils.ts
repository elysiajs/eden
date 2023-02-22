import type { serialize, deserialize } from 'superjson'
import type { EdenCall, EdenConfig } from './types'

export class EdenFetchError<
    Status extends number = number,
    Value = unknown
> extends Error {
    status: Status
    value: Value

    constructor(status: Status, value: Value) {
        super()

        this.status = status
        this.value = value
    }
}


const camelToDash = (str: string) =>
    str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

export const composePath = (
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

export class Signal {
    private url: string
    private config: EdenConfig

    private pendings: Array<{ n: string[] } | { n: string[]; p: any }> = []
    private operation: Promise<any[]> | null = null
    private isFetching = false

    private sJson: Promise<{
        serialize: typeof serialize
        deserialize: typeof deserialize
    }>

    constructor(url: string, config: EdenConfig) {
        this.url = url
        this.config = config

        this.sJson = import('superjson').then((superJson) => {
            return {
                serialize: superJson.serialize,
                deserialize: superJson.deserialize
            }
        })
    }

    setConfig(config: EdenConfig) {
        this.config = config
    }

    clone(config?: EdenConfig) {
        return new Signal(this.url, config ?? this.config)
    }

    async run(procedure: string[], params: any) {
        const current = +this.pendings.length
        this.pendings.push(
            params !== undefined
                ? { n: procedure, p: params }
                : { n: procedure }
        )

        if (this.isFetching) return this.operation?.then((x) => x[current])
        this.isFetching = true

        this.operation = new Promise((resolve) => {
            setTimeout(async () => {
                const requests = [...this.pendings]
                this.pendings = []

                const { serialize, deserialize } = await this.sJson

                const results = await fetch(
                    `${this.url}${this.config.fn ?? '/~fn'}`,
                    {
                        method: 'POST',
                        ...this.config.fetch,
                        headers: {
                            'content-type': 'elysia/fn',
                            ...this.config.fetch?.headers
                        },
                        body: JSON.stringify(serialize(requests))
                    }
                )

                if (results.status === 200)
                    resolve(results.json().then((x) => deserialize(x as any)))
                else
                    resolve(
                        Array(requests.length).fill(
                            new Error(await results.text())
                        )
                    )
            }, 33)
        })

        const result = await this.operation.then((results) => results[current])

        this.operation = null
        this.isFetching = false

        return result
    }
}
