import { edenFetch, edenTreaty, treaty } from '../src'
import Elysia from 'elysia'

const app = new Elysia().get('/:id', () => null)

type App = typeof app

const edenClient = treaty<App>('http://localhost:3000')

//    ^? {}
// This doesn't work:
edenClient({ id: '1' }).get() // This expression is not callable. Type '{}' has no call signatures.

const fetch = edenFetch<App>('http://localhost:3000')
fetch('/:id', { params: { id: '1' } }) // Works

const edenTreaty1Client = edenTreaty<App>('http://localhost:3000')
edenTreaty1Client[':id'].get() // Works
