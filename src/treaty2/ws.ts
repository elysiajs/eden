import type { InputSchema } from 'elysia'
import type { Treaty } from './types'
import { isNumericString } from '../treaty/utils'

const ISO8601DateString = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/

export class EdenWS<in out Schema extends InputSchema<any> = {}> {
    ws: WebSocket

    constructor(public url: string) {
        this.ws = new WebSocket(url)
    }

    send(data: Schema['body'] | Schema['body'][]) {
        if (Array.isArray(data)) {
            data.forEach((datum) => this.send(datum))

            return this
        }

        this.ws.send(
            typeof data === 'object' ? JSON.stringify(data) : data.toString()
        )

        return this
    }

    on<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (event: Treaty.WSEvent<K, Schema['response']>) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        return this.addEventListener(type, listener, options)
    }

    off<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ) {
        this.ws.removeEventListener(type, listener, options)

        return this
    }

    subscribe(
        onMessage: (
            event: Treaty.WSEvent<'message', Schema['response']>
        ) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        return this.addEventListener('message', onMessage, options)
    }

    addEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (event: Treaty.WSEvent<K, Schema['response']>) => void,
        options?: boolean | AddEventListenerOptions
    ) {
        this.ws.addEventListener(
            type,
            (ws) => {
                if (type === 'message') {
                    let data = (ws as MessageEvent).data.toString() as any
                    const start = data.charCodeAt(0)
                    const end = data.charCodeAt(data.length - 1)
                    if (start === 47 || start === 123)
                        try {
                            data = JSON.parse(data, (key, value) => {
                                if(typeof value === 'string' && ISO8601DateString.test(value)) {
                                    const d = new Date(value)
                                    if(!Number.isNaN(d.getTime())) 
                                        return d
                                }
                                return value
                            })
                        } catch {
                            // Not Empty
                        }

                    else if (isNumericString(data)) data = +data
                    else if (data === 'true') data = true
                    else if (data === 'false') data = false
                    else if (data === 'null') data = null
                    // Remove " before parsing
                    else if (start === 34 && end === 34 && ISO8601DateString.test(data))
                        data = new Date(data.substring(1, data.length - 1))

                    listener({
                        ...ws,
                        data
                    } as any)
                } else listener(ws as any)
            },
            options
        )

        return this
    }

    removeEventListener<K extends keyof WebSocketEventMap>(
        type: K,
        listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ) {
        this.off(type, listener, options)

        return this
    }

    close() {
        this.ws.close()

        return this
    }
}
