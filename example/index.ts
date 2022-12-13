import { join } from 'path'

Bun.spawn(['bun', 'server.ts'], {
    stdout: 'pipe',
    cwd: import.meta.dir
})

Bun.spawn(['npm', 'run', 'dev'], {
    stdout: 'pipe',
    cwd: join(import.meta.dir, 'client')
})

console.log(
    'If things work properly, see http://localhost:5173'
)
