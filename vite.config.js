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
            'entry': {
                'index': resolve(__dirname, 'src/index.ts'),
                'legacy/index': resolve(__dirname, 'src/legacy/index.ts')
            },
            formats: ['es', 'cjs']
        },
        rollupOptions: {
            external: ['elysia', 'superjson'],
            assetFileNames: `[name].[ext]`
        }
    }
})
