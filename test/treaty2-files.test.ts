import Elysia, { t } from 'elysia'
import { treaty } from '../src'
import { describe, expect, it } from 'bun:test'
import { expectTypeOf } from 'expect-type'
import { BunFile } from 'bun'

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

describe('Treaty2 - Using t.File() and t.Files() from server', async () => {
    const filePath1 = `${import.meta.dir}/public/aris-yuzu.jpg`
    const filePath2 = `${import.meta.dir}/public/midori.png`
    const filePath3 = `${import.meta.dir}/public/kyuukurarin.mp4`

    const bunFile1 = Bun.file(filePath1)
    const bunFile2 = Bun.file(filePath2)
    const bunFile3 = Bun.file(filePath3)

    const file1 = new File([await bunFile2.arrayBuffer()], 'aris-yuzu.jpg', {
        type: 'image/jpeg'
    })
    const file2 = new File([await bunFile1.arrayBuffer()], 'midori.png', {
        type: 'image/png'
    })
    const file3 = new File([await bunFile3.arrayBuffer()], 'kyuukurarin.mp4', {
        type: 'video/mp4'
    })

    const filesForm = new FormData()
    filesForm.append('files', file1)
    filesForm.append('files', file2)
    filesForm.append('files', file3)

    const bunFilesForm = new FormData()
    bunFilesForm.append('files', bunFile1)
    bunFilesForm.append('files', bunFile2)
    bunFilesForm.append('files', bunFile3)

    it('check route types', async () => {
        type RouteFiles = client['files']['post']

        expectTypeOf<RouteFiles>().parameter(0).toEqualTypeOf<{
            files: Array<File | BunFile> | File | BunFile
        }>()

        type RouteFile = client['any']['file']['post']

        expectTypeOf<RouteFile>().parameter(0).toEqualTypeOf<{
            file: File | BunFile
        }>()

        type RouteFileWithSpecific = client['any']['file']['post']

        expectTypeOf<RouteFileWithSpecific>().parameter(0).toEqualTypeOf<{
            file: File | BunFile
        }>()
    })

    it('accept a single Bun.file', async () => {
        const { data: files } = await client.files.post({
            files: bunFile1
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([bunFile1.name])

        const { data: filesbis } = await client.files.post({
            files: [bunFile1]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([bunFile1.name])

        const { data: file } = await client.any.file.post({
            file: bunFile1
        })

        expect(file).not.toBeNull()
        expect(file).not.toBeUndefined()
        expect(file).toEqual(bunFile1.name)

        const { data: pngFile } = await client.png.file.post({
            file: bunFile2
        })

        expect(pngFile).not.toBeNull()
        expect(pngFile).not.toBeUndefined()
        expect(pngFile).toEqual(bunFile2.name)

        const {
            data: notPngFile,
            error,
            status
        } = await client.png.file.post({
            file: bunFile1
        })

        expect(notPngFile).toBeNull()
        expect(error?.status).toBe(422)
        expect(status).toBe(422)
    })

    it('accept a single regular file', async () => {
        const { data: files } = await client.files.post({
            files: file1
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([file1.name])

        const { data: filesbis } = await client.files.post({
            files: [file1]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([file1.name])

        const { data: file } = await client.any.file.post({
            file: file1
        })

        expect(file).not.toBeNull()
        expect(file).not.toBeUndefined()
        expect(file).toEqual(file1.name)
    })

    it('accept an array of multiple Bun.file', async () => {
        const { data: files } = await client.files.post({
            files: [bunFile1, bunFile2, bunFile3]
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([bunFile1.name, bunFile2.name, bunFile3.name])

        const { data: filesbis } = await client.files.post({
            files: bunFilesForm.getAll('files') as File[]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([bunFile1.name, bunFile2.name, bunFile3.name])
    })

    it('accept an array of multiple regular file', async () => {
        const { data: files } = await client.files.post({
            files: [file1, file2, file3]
        })

        expect(files).not.toBeNull()
        expect(files).not.toBeUndefined()
        expect(files).toEqual([file1.name, file2.name, file3.name])

        const { data: filesbis } = await client.files.post({
            files: filesForm.getAll('files') as File[]
        })

        expect(filesbis).not.toBeNull()
        expect(filesbis).not.toBeUndefined()
        expect(filesbis).toEqual([file1.name, file2.name, file3.name])
    })
})
