import { cp, rm } from 'node:fs/promises'

import { type BuildOptions, type Plugin, build, context } from 'esbuild'

const staticFiles: [string, string][] = [
  ['manifest.json', 'dist/manifest.json'],
  ['src/action/action.html', 'dist/action/action.html'],
  ['src/action/action.css', 'dist/action/action.css'],
  ['src/options/options.html', 'dist/options/options.html'],
  ['src/options/options.css', 'dist/options/options.css'],
  ['src/ui/chrome.css', 'dist/ui/chrome.css'],
  ['media', 'dist/media'],
]

const copyStatic: Plugin = {
  name: 'copy-static',
  setup(pluginBuild) {
    pluginBuild.onEnd(async () => {
      await Promise.all(staticFiles.map(([source, target]) => cp(source, target, { recursive: true })))
    })
  },
}

const watch = process.argv.includes('--watch')

const options: BuildOptions = {
  entryPoints: ['src/background.ts', 'src/action/action.ts', 'src/options/options.ts'],
  outdir: 'dist',
  outbase: 'src',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome102',
  minify: !watch,
  sourcemap: watch,
  logLevel: 'info',
  plugins: [copyStatic],
}

await rm('dist', { recursive: true, force: true })

await (watch ? (await context(options)).watch() : build(options))
