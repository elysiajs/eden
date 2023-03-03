import { SCHEMA, EXPOSED, type IsPathParameter } from 'elysia'
import { Prettify } from 'elysia/src/types'

import { edenTreaty } from '../src'
import type { Server } from './server'

const treaty = edenTreaty<Server>('http://localhost:8080')
