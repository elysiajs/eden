import { edenFn } from '@elysia/eden'
import type { Server } from '../../server'

export const fn = edenFn<Server>('http://localhost:8080', {
    fn: '/~fn',
    fetch: {
        headers: {
            Authorized: something
        }
    }
})

// @ts-ignore
const app = document.querySelector<HTMLDivElement>('#app')!

app.textContent = await fn.mirror(1).then((x) => x.toString())

Promise.all(new Array(100).fill(null).map((_, i) => fn.mirror(i))).then(
    console.log
)
