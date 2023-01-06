import { eden } from '../src'
import type { Server } from './server'
import { SCHEMA } from 'elysia'

const app = eden<Server>('http://localhost:8080')
