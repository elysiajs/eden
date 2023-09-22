import { defineConfig } from 'tsup'
import { resolve } from 'path'
import { execSync } from 'child_process'

import { copyFile } from 'fs/promises'

export default defineConfig({
    entry: {
        index: resolve(__dirname, 'src/index.ts'),
        treaty: resolve(__dirname, 'src/treaty/index.ts'),
        fetch: resolve(__dirname, 'src/fetch/index.ts')
    },
    format: ['cjs', 'esm', 'iife'],
    globalName: 'Eden',
    minify: true,
    external: ['elysia'],
    dts: true,
    async onSuccess() {
        execSync('tsc --emitDeclarationOnly --declaration', {
            cwd: resolve(__dirname, 'dist')
        })
    }
})
