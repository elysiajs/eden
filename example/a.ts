import { Elysia, t } from 'elysia'
import { treaty } from '../src'

const app = new Elysia()
    .post('/files', ({ body: { files } }) => files.map((file) => file.name), {
        body: t.Object({
            files: t.Files()
        })
    })
    .post('/any/file', ({ body: { file } }) => file.name, {
        body: t.Object({
            file: t.File({ type: 'image/*' })
        })
    })
    .post('/png/file', ({ body: { file } }) => file.name, {
        body: t.Object({
            file: t.File({ type: 'image/png' })
        })
    })

const client = treaty(app)
type client = typeof client

const filePath1 = `test/public/aris-yuzu.jpg`
const filePath2 = `test/public/midori.png`
const filePath3 = `test/public/kyuukurarin.mp4`

const { data: files } = await client.files.post({
	files: '' as any
})

console.log(files)
