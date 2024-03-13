import { Elysia, t } from 'elysia'
import { treaty } from '../src'
import { cors } from '../../cors/src'

const app = new Elysia()
    .use((app) => {
        // @ts-ignore
        app.use(cors({}))

        return app
    })
    .get('/activitiy/:page/:size', ({ params }) => params)
    .listen(3000)

const api = treaty(app)

console.log(await api.activitiy({ page: 1 })({ size: 10 }).get())
