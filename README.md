# @elysiajs/eden
Fully type-safe Elysia client refers to the [documentation](https://elysiajs.com/eden/overview)

## Installation
```bash
bun add elysia @elysiajs/eden
```

## Example
```typescript
// server.ts
import { Elysia, t } from 'elysia'

const app = new Elysia()
    .get('/', () => 'Hi Elysia')
    .get('/id/:id', ({ params: { id } }) => id)
    .post('/mirror', ({ body }) => body, {
        schema: {
            body: t.Object({
                id: t.Number(),
                name: t.String()
            })
        }
    })
    .listen(8080)

export type App = typeof app

// client.ts
import { edenTreaty } from '@elysiajs/eden'
import type { App } from './server'

const app = edenTreaty<App>('http://localhost:8080')

// data: Hi Elysia (fully type-safe)
const { data: pong } = app.index.get()

// data: 1895
const { data: id } = app.id.1895.get()

// data: { id: 1895, name: 'Skadi' }
const { data: nendoroid } = app.mirror.post({
    id: 1895,
    name: 'Skadi'
})
```
