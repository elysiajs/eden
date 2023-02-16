import { SCHEMA, EXPOSED } from 'elysia'

import { eden } from '../src'
import type { Server } from './server'

const app = eden<Server>('http://localhost:8080/')
const fn = app.$fn

const $fn = fn.$clone({
    fetch: {
        headers: {
            authorization: 'a'
        }
    }
})

const posts = await $fn.authorized()
