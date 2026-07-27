import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { azoraLanguage } from '../src/codemirror/azora-language.js'

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
    write_i32: ignore,
    write_i64: ignore,
    write_f64: ignore,
    write_f32: ignore,
    write_bool: ignore,
    write_str: ignore,
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
const highlights = await invokeJson('azlsHighlight', [unicodeSource, corpus])
assert.ok(highlights.some((span) => span.type === 'keyword'))
assert.ok(highlights.some((span) => span.type === 'string'))

function codeMirrorTokens(source, language) {
  const state = EditorState.create({ doc: source, extensions: [language] })
  const cursor = syntaxTree(state).cursor()
  const tokens = []
  do {
    if (cursor.name !== 'Document') {
      tokens.push({
        type: cursor.name,
        text: source.slice(cursor.from, cursor.to),
      })
    }
  } while (cursor.next())
  return tokens
}

const unresolvedIr = 'func known(value: Int) { missing(value) }'
const unresolvedIrTokens = codeMirrorTokens(unresolvedIr, azoraLanguage(unresolvedIr))
assert.equal(
  unresolvedIrTokens.some((token) =>
    token.type === 'variableName.function' && token.text === 'missing'
  ),
  false,
  'ordinary Azora parsing must not infer functions from call syntax',
)

const resolvedIr = [
  'func tuple(): __std_Tuple_Int_Int {',
  '    return __std_Tuple_Int_Int(1, 2)',
  '}',
  'func main(): Unit { __std_println("known") }',
].join('\n')
const resolvedIrTokens = codeMirrorTokens(
  resolvedIr,
  azoraLanguage(resolvedIr, { resolvedReferences: true }),
)
assert.ok(
  resolvedIrTokens.some((token) =>
    token.type === 'variableName.function' && token.text === '__std_println'
  ),
  'compiler-resolved Azora IR calls must retain function highlighting',
)
assert.ok(
  resolvedIrTokens
    .filter((token) => token.text === '__std_Tuple_Int_Int')
    .every((token) => token.type === 'typeName'),
  'a compiler-resolved IR type must stay type-colored when used as a constructor',
)

const macroSource = 'func main() { fin tuple = tup@(1, 2); fin other = collect_all@(tuple) }'
const macroHighlights = await invokeJson('azlsHighlight', [macroSource, corpus])
assert.deepEqual(
  macroHighlights
    .filter((span) => span.type === 'macro')
    .map((span) => macroSource.slice(span.start, span.end)),
  ['tup@', 'collect_all@'],
)

const semanticSource = [
  'func known(value: Int) {',
  '    var local = value',
  '    known(local)',
  '    missing(local)',
  '}',
].join('\n')
const semanticHighlights = await invokeJson('azlsHighlight', [semanticSource, corpus])
const semanticTokens = semanticHighlights.map((span) => ({
  type: span.type,
  text: semanticSource.slice(span.start, span.end),
}))
assert.equal(
  semanticTokens.filter((token) => token.type === 'function' && token.text === 'known').length,
  2,
  'the declaration and resolved call must be function-colored',
)
assert.ok(
  semanticTokens.some((token) => token.type === 'parameter' && token.text === 'value'),
  'parameters must have their own semantic color',
)
assert.ok(
  semanticTokens.some((token) => token.type === 'variable' && token.text === 'local'),
  'variables must be classified independently from functions',
)
assert.equal(
  semanticTokens.some((token) => token.type === 'function' && token.text === 'missing'),
  false,
  'an undeclared call must not be function-colored',
)

const importedFunctionSource = [
  'module demo',
  'import std.io',
  'func main() {',
  '    std::println("known")',
  '    missing("unknown")',
  '}',
].join('\n')
const importedFunctionHighlights = await invokeJson('azlsHighlight', [importedFunctionSource, corpus])
assert.ok(importedFunctionHighlights.some((span) =>
  span.type === 'function' &&
  importedFunctionSource.slice(span.start, span.end) === 'println'
))
assert.equal(importedFunctionHighlights.some((span) =>
  span.type === 'function' &&
  importedFunctionSource.slice(span.start, span.end) === 'missing'
), false)

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

const bareTupleSource = [
  'module demo',
  'import std.container.tuple',
  'func divmod(a: Int, b: Int): Tuple<Int, Int> {',
  '    return std::tupleOf(a / b, a % b)',
  '}',
].join('\n')
const bareTupleStart = bareTupleSource.indexOf('Tuple')
const bareTupleHighlights = await invokeJson('azlsHighlight', [bareTupleSource, corpus])
assert.equal(
  bareTupleHighlights.some((span) =>
    span.type === 'type' &&
    span.start === bareTupleStart &&
    bareTupleSource.slice(span.start, span.end) === 'Tuple'
  ),
  false,
  'a zone type without its qualifier must not receive semantic type highlighting',
)
const bareTupleHover = await invokeJson('azlsHover', [
  bareTupleSource,
  bareTupleStart + 2,
  corpus,
])
assert.equal(
  bareTupleHover.found,
  false,
  'a zone type without its qualifier must not resolve stdlib documentation',
)

const qualifiedTupleSource = bareTupleSource.replace(': Tuple<', ': std::Tuple<')
const qualifiedTupleStart = qualifiedTupleSource.indexOf('Tuple')
const qualifiedTupleHighlights = await invokeJson('azlsHighlight', [qualifiedTupleSource, corpus])
assert.equal(
  qualifiedTupleHighlights.some((span) =>
    span.type === 'type' &&
    span.start === qualifiedTupleStart &&
    qualifiedTupleSource.slice(span.start, span.end) === 'Tuple'
  ),
  true,
  'a correctly qualified and imported zone type must be highlighted',
)
const qualifiedTupleHover = await invokeJson('azlsHover', [
  qualifiedTupleSource,
  qualifiedTupleStart + 2,
  corpus,
])
assert.equal(qualifiedTupleHover.found, true)
assert.equal(workspace.documents[qualifiedTupleHover.document].path, 'std/container/tuple.az')

const unknownTypeSource = 'func inspect(value: MissingType): Int { return 0 }'
const unknownTypeStart = unknownTypeSource.indexOf('MissingType')
const unknownTypeHighlights = await invokeJson('azlsHighlight', [unknownTypeSource, corpus])
assert.equal(
  unknownTypeHighlights.some((span) => span.type === 'type' && span.start === unknownTypeStart),
  false,
  'unknown capitalized identifiers must not be colored as known types',
)

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
