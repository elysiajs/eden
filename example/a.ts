import { Elysia, sse } from 'elysia'
import { treaty } from '../src'

export const app = new Elysia()
    .get('/chunk', async function* () {
        const chunks = ['chunk1', 'chunk2\n\nhello world']

        for (const chunk of chunks)
            yield sse({
                event: 'data',
                data: { text: chunk, attempt: 1 }
            })

        yield sse({
            event: 'complete',
            data: { message: 'done' }
        })
    })
    .listen(3000)

const api = treaty<typeof app>('localhost:3000')

const { data } = await api.chunk.get()

for await (const datum of data!) {
    console.log(datum)
}
