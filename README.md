# @elysiajs/eden
Fully type-safe Elysia client.

## Installation
```bash
bun add @elysiajs/eden
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
import { eden } from '@elysiajs/eden'
import type { App } from './server'

const client = eden<App>('http://localhost:8080')

// return: Hi Elysia (fully type-safe)
client.index.GET().then(console.log)

// return: 1895
client.id.1895.GET().then(console.log)

// return: { id: 1895, name: 'Skadi' }
client.mirror.POST({
    id: 1895,
    name: 'Skadi'
}).then(console.log)
```
