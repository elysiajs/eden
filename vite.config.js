// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
    plugins: [dts()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'esbuild',
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: '@elysia/eden',
            fileName: 'index',
            formats: ['es', 'cjs', 'umd']
        },
        rollupOptions: {
            external: ['elysia'],
            assetFileNames: `[name].[ext]`
        }
    }
})
