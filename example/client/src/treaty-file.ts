import { edenTreaty } from '@elysia/eden'
import type { Server } from '../../server'

export const client = edenTreaty<Server>('http://localhost:8080')

const id = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id)! as T

document.addEventListener('DOMContentLoaded', () => {
    id('form').addEventListener('submit', async (event) => {
        event.preventDefault()

        const res = await client.image.post({
            image: id<HTMLInputElement>('file').files!
        })
    })
})
