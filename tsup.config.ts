import { defineConfig } from 'tsup'
import { resolve } from 'path'
import { exec } from 'child_process'

export default defineConfig({
    entry: {
        index: resolve(__dirname, 'src/index.ts'),
        treaty: resolve(__dirname, 'src/treaty/index.ts'),
        fetch: resolve(__dirname, 'src/fetch/index.ts')
    },
    format: ['cjs', 'esm', 'iife'],
    globalName: 'Eden',
    minify: true,
    external: ['elysia', 'superjson'],
    async onSuccess() {
        exec('tsc --emitDeclarationOnly --declaration', {
            cwd: resolve(__dirname, 'dist')
        })
    }
})
