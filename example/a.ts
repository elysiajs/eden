import { Elysia, t } from 'elysia'
import { treaty } from '../src'

export const app = new Elysia({ prefix: '/level' })
    .get('/a', '2')
    .get('/:id', ({ params: { id } }) => id)
    .get('/:id/a', ({ params: { id } }) => id)

type Res = typeof app._routes

const api = treaty<typeof app>('localhost:3000')

type A = {
    a: 'a'
    // ':b': 'b'
}

type C = Extract<keyof A, `:${string}`> extends string ? true : false

type B = Extract<keyof A, `:${string}`> extends infer Path extends string
    ? Path
    : never
