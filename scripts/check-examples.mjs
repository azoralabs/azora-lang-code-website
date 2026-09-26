#!/usr/bin/env node
/**
 * Type-check (and optionally run) every example the playground offers.
 *
 * The Example selector is the first thing most visitors touch, so a stale
 * snippet is a broken first impression. This walks the example data files,
 * hands each snippet to the real compiler, and reports the ones that fail.
 *
 *   node scripts/check-examples.mjs          check only
 *   node scripts/check-examples.mjs --run    also run the ones with a main()
 *
 * AZORA_BIN overrides the compiler path.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const alsoRun = process.argv.includes('--run')

const AZORA = process.env.AZORA_BIN
  || path.resolve(root, '..', 'azora-lang', 'app', 'build', 'install', 'azora', 'bin', 'azora')

const SOURCES = [
  'src/data/codeExamples.js',
  'src/data/engineExamples.js',
  'src/data/sampleCode.js',
]

/**
 * Pull out every `title` / `code` pair. The data files are plain modules of
 * template literals, so a small scanner beats pulling in a JS parser.
 */
function examples(source, file) {
  const out = []
  const re = /title:\s*'([^']*)'[\s\S]*?code:\s*`([\s\S]*?)`,\n/g
  let m
  while ((m = re.exec(source))) out.push({ title: m[1], code: m[2] })

  if (!out.length) {
    // sampleCode.js exports a single bare template literal
    const single = source.match(/=\s*`([\s\S]*?)`\s*$/m)
    if (single) out.push({ title: path.basename(file), code: single[1] })
  }
  return out
}

/** The data files escape `${` so React template literals survive. */
const unescape = (code) => code
  .replace(/\$\{'\$\{'\}/g, '${')   // sampleCode.js emits a literal ${ this way
  .replace(/\\\$\{/g, '${')
  .replace(/\\`/g, '`')

/*
 * Engine examples `import engine.render`, which the playground bundles from
 * src/engine/libraries/<version>/. They are checked in a directory that also
 * holds those sources, so the compiler's sibling discovery resolves them the
 * same way the playground's stdlib manifest does.
 */
const { VERSIONS } = await import(path.join(root, 'src/engine/versions.js'))
const engineLibDir = path.join(root, 'src/engine/libraries',
  VERSIONS.find((v) => v.isDefault)?.id || VERSIONS[0].id)

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'azplay-'))
const engineTmp = path.join(tmp, 'engine')
await fs.mkdir(engineTmp, { recursive: true })
for (const lib of await fs.readdir(engineLibDir)) {
  if (lib.endsWith('.az')) {
    await fs.copyFile(path.join(engineLibDir, lib), path.join(engineTmp, lib))
  }
}
let checked = 0
let ran = 0
const failures = []

for (const rel of SOURCES) {
  const file = path.join(root, rel)
  const source = await fs.readFile(file, 'utf8').catch(() => null)
  if (!source) { console.warn(`  skip ${rel} (missing)`); continue }

  for (const { title, code } of examples(source, rel)) {
    const program = unescape(code).trim()
    const slug = title.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()
    const dir = program.includes('import engine.') ? engineTmp : tmp
    const onDisk = path.join(dir, `${slug}.az`)
    await fs.writeFile(onDisk, program + '\n')

    checked += 1
    try {
      await exec(AZORA, ['check', onDisk], { timeout: 180000 })
    } catch (error) {
      const out = `${error.stdout || ''}${error.stderr || ''}`.trim()
      failures.push({ rel, title, stage: 'check', message: out.split('\n').slice(0, 3).join('\n') })
      continue
    }

    // Engine examples drive a WebGL device that only exists in the browser,
    // so they are type-checked but not executed here.
    const runnable = /\bfunc\s+main\s*\(/.test(program) && !program.includes('import engine.')
    if (alsoRun && runnable) {
      ran += 1
      try {
        await exec(AZORA, ['run', onDisk], { timeout: 180000 })
      } catch (error) {
        const out = `${error.stdout || ''}${error.stderr || ''}`.trim()
        failures.push({ rel, title, stage: 'run', message: out.split('\n').slice(0, 3).join('\n') })
      }
    }
  }
}

console.log(`${checked} examples checked${alsoRun ? `, ${ran} run` : ''}`)
if (failures.length) {
  console.error(`\n${failures.length} failing:\n`)
  for (const f of failures) {
    console.error(`  [${f.stage}] ${f.title}  (${f.rel})`)
    console.error(f.message.split('\n').map((l) => `      ${l}`).join('\n'))
    console.error('')
  }
  process.exit(1)
}
console.log('every example compiles')
