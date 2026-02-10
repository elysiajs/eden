import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia().get('/thing', () => 'hi')

async function getClient() {
  return treaty(app)
}

const api = await getClient()

const { status } = await api.thing.get()

console.log(status)
