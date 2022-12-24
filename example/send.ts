import { eden } from '../src'
import type { Server } from './server'

const app = eden<Server>('http://localhost:8080')

app.index.GET()
    .then((result) => {
        console.log(result)
    })

    api.shelf.plushie.PUT({
        name: 'Blåhaj',
        quantity: '200'
      })
      