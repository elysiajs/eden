import type { serialize, deserialize } from 'superjson'
import type { EdenFn } from './types'

export class Signal {
    private url: string
    private config: EdenFn.Config

    private pendings: Array<{ n: string[] } | { n: string[]; p: any }> = []
    private operation: Promise<any[]> | null = null
    private isFetching = false

    private sJson: Promise<{
        serialize: typeof serialize
        deserialize: typeof deserialize
    }>

    constructor(url: string, config: EdenFn.Config) {
        this.url = url
        this.config = config

        this.sJson = import('superjson').then((superJson) => {
            return {
                serialize: superJson.serialize,
                deserialize: superJson.deserialize
            }
        })
    }

    setConfig(config: EdenFn.Config) {
        this.config = config
    }

    clone(config?: EdenFn.Config) {
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
