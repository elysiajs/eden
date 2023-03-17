import type { Elysia } from 'elysia'

import type { EdenTreaty } from './treaty'
import type { EdenFetch } from './fetch'
import type { EdenFn } from './fn'

export { edenTreaty } from './treaty'
export { edenFetch } from './fetch'
export { edenFn } from './fn'

// @ts-ignore
// export const eden: Eden = (domain: string) => ({
//     treaty(config) {
//         return import('./treaty').then((x) => x.edenTreaty(domain, config))
//     },
//     fn(config) {
//         return import('./fn').then((x) => x.edenFn(domain, config))
//     },
//     fetch(config) {
//         return import('./fetch').then((x) => x.edenFetch(domain, config))
//     }
// })

// type Eden = (domain: string) => {
//     treaty<App extends Elysia<any>>(
//         config?: EdenTreaty.Config
//     ): EdenTreaty.Create<App>

//     fetch<App extends Elysia<any>>(
//         config?: EdenFetch.Config
//     ): EdenFetch.Create<App>

//     fn<App extends Elysia<any>>(config?: EdenFn.Config): EdenFn.Create<App>
// }
