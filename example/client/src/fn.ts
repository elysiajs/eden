// import { eden } from '@elysia/eden'
// import type { Server } from '../../server'

// export const client = eden<Server>('http://localhost:8080')
// const fn = client.fn

// // @ts-ignore
// const app = document.querySelector<HTMLDivElement>('#app')!

// app.textContent = await fn.mirror(1).then((x) => x.toString())

// Promise.allSettled([fn.mirror(1), fn.authorized()]).then(console.log)
// Promise.all(new Array(100).fill(null).map((_, i) => fn.mirror(i))).then(
//     console.log
// )
