// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

import rimraf from 'rimraf'

import { renameSync, unlinkSync } from 'fs'

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
            beforeWriteFile(filePath) {
              return { filePath: filePath.endsWith('.d.ts') ? filePath : `${filePath}.d.ts` }
            },
        })
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'esbuild',
        lib: {
            entry: {
                'index': resolve(__dirname, 'src/index.ts'),
                'treaty': resolve(__dirname, 'src/treaty/index.ts'),
                'fetch': resolve(__dirname, 'src/fetch/index.ts'),
                'fn': resolve(__dirname, 'src/fn/index.ts'),
            },
            formats: ['es', 'cjs']
        },
        rollupOptions: {
            external: ['elysia', 'superjson'],
            assetFileNames: `[name].[ext]`
        }
    }
})
