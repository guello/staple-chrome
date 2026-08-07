import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { glob } from 'node:fs/promises'

import { build } from 'esbuild'

const OUTPUT_DIR = 'node_modules/.cache/staple-chrome'

const entryPoints: string[] = []
for await (const file of glob('src/**/*.test.ts')) entryPoints.push(file)
if (entryPoints.length === 0) throw new Error('No test files found')

const result = await build({
  entryPoints,
  outdir: OUTPUT_DIR,
  outbase: 'src',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node24',
  metafile: true,
  logLevel: 'warning',
  banner: { js: 'globalThis.chrome ??= {};' },
})

for (const bundle of Object.keys(result.metafile.outputs)) {
  const child = spawn(process.execPath, [bundle], { stdio: 'inherit' })
  const [code] = (await once(child, 'close')) as [number | null]
  if (code !== 0) {
    process.exitCode = code ?? 1
    break
  }
}
