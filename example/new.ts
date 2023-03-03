import { eden } from '../src'
import type { Server } from './server'

const app = eden<Server>('http://localhost:8080')

const main = async () => {
    const data = await app.fetch('/products/nendoroid/:id', {
        method: 'PUT',
        body: {
            name: 'awd'
        },
        params: {
            id: '1'
        }
    })

    // Narrow down error type
    if (data instanceof Error) {
        switch (data.status) {
            case 400:
                return data.value.error

            default:
                return data.message
        }
    }

    data.id
}
