import { eden } from '@elysia/eden/dist/legacy'
import type { Server } from '../../server'

export const client = eden<Server>('http://localhost:8080')
