import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile, rm } from 'node:fs/promises'

const { version } = JSON.parse(await readFile('package.json', 'utf8')) as { version: string }
const output = `staple-chrome-${version}.zip`

await rm(output, { force: true })

const child = spawn('zip', ['-r', `../${output}`, '.', '-x', '.DS_Store', '*/.DS_Store'], {
  cwd: 'dist',
  stdio: 'inherit',
})
const [code] = (await once(child, 'close')) as [number | null]
if (code !== 0) process.exitCode = code ?? 1
