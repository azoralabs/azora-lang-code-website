import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageMetadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const version = process.argv[2] || packageMetadata.version
const assetRoot = path.join(root, 'public', 'azls', version)
const [wasmBytes, workspace] = await Promise.all([
  readFile(path.join(assetRoot, 'azls.wasm')),
  readFile(path.join(assetRoot, 'stdlib.json'), 'utf8').then(JSON.parse),
])
const module = await WebAssembly.compile(wasmBytes)
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ignore = () => {}
const imports = {
  env: {
    print_i32: ignore,
    print_i64: ignore,
    print_f64: ignore,
    print_f32: ignore,
    print_bool: ignore,
    print_str: ignore,
  },
}
const corpus = workspace.documents.map((document) =>
  `${document.uri}<:AZLS-FIELD:>${document.source}<:AZLS-RECORD:>`,
).join('')

async function invoke(name, args = []) {
  const instance = await WebAssembly.instantiate(module, imports)
  const exports = instance.exports
  const wasmArgs = args.map((value) => {
    if (typeof value !== 'string') return value
    const bytes = encoder.encode(value)
    const pointer = exports.azlsReserve(bytes.length)
    new Uint8Array(exports.memory.buffer, pointer + 4, bytes.length).set(bytes)
    return pointer
  })
  const pointer = exports[name](...wasmArgs)
  const length = new DataView(exports.memory.buffer).getInt32(pointer, true)
  return decoder.decode(new Uint8Array(exports.memory.buffer, pointer + 4, length))
}

async function invokeJson(name, args) {
  return JSON.parse(await invoke(name, args))
}

assert.equal(await invoke('azlsVersion'), version)
assert.ok(workspace.documents.length > 0)

const unicodeSource = 'module exemplu\nfunc salut(): String { return "Bună" }'
const highlights = await invokeJson('azlsHighlight', [unicodeSource])
assert.ok(highlights.some((span) => span.type === 'keyword'))
assert.ok(highlights.some((span) => span.type === 'string'))

const diagnostics = await invokeJson('azlsDiagnostics', ['func main() {'])
assert.equal(diagnostics[0]?.severity, 'error')

const localSource = 'func answer(): Int { return 42 }\nfunc main() { answer() }'
const localDefinition = await invokeJson('azlsDefinition', [
  localSource,
  localSource.lastIndexOf('answer') + 2,
  corpus,
])
assert.equal(localDefinition.document, -1)
assert.equal(localSource.slice(localDefinition.start, localDefinition.end), 'answer')

const importSource = 'module demo\nimport std.container.tuple\n'
const importDefinition = await invokeJson('azlsDefinition', [
  importSource,
  importSource.indexOf('std.container.tuple') + 4,
  corpus,
])
assert.equal(importDefinition.found, true)
const importDocument = workspace.documents[importDefinition.document]
assert.equal(importDocument.path, 'std/container/tuple.az')

const completionSource = 'module demo\nfunc main() { tup'
const completions = await invokeJson('azlsComplete', [
  completionSource,
  completionSource.length,
  corpus,
])
assert.ok(completions.some((item) => {
  const source = item.document === -1
    ? completionSource
    : workspace.documents[item.document].source
  return source.slice(item.start, item.end) === 'tupleOf'
}))

console.log(`AZLS ${version}: ${workspace.documents.length} std documents and all ABI checks passed.`)
