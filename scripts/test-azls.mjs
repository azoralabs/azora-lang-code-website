import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { azoraLanguage } from '../src/codemirror/azora-language.js'
import { classifySemanticHighlights } from '../src/codemirror/semantic-usage.js'
import { engineExamples } from '../src/data/engineExamples.js'
import { createAzlsWorkspace } from '../src/engine/azlsLoader.js'

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
  const inputBytes = args.reduce((total, value) =>
    total + (typeof value === 'string' ? encoder.encode(value).length + 4 : 0), 0)
  const desiredBytes = Math.max(4 * 1024 * 1024, inputBytes * 8 + 64 * 1024)
  const missingBytes = desiredBytes - exports.memory.buffer.byteLength
  if (missingBytes > 0) {
    exports.memory.grow(Math.ceil(missingBytes / (64 * 1024)))
  }
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

const workspaceIndex = createAzlsWorkspace(workspace.documents)

async function highlightInChunks(source) {
  const context = workspaceIndex.contextFor(source)
  const highlights = []
  const chunkSize = 512
  for (let start = 0; start < source.length; start += chunkSize) {
    const end = Math.min(source.length, start + chunkSize)
    const spans = await invokeJson('azlsHighlightRange', [
      source,
      context.corpus,
      start,
      end,
    ])
    highlights.push(...spans.filter((span) => span.start >= start && span.start < end))
  }
  return { context, highlights }
}

assert.equal(await invoke('azlsVersion'), version)
assert.ok(workspace.documents.length > 0)

const unicodeSource = 'module exemplu\nfunc salut(): String { return "Bună" }'
const highlights = await invokeJson('azlsHighlight', [unicodeSource, corpus])
assert.ok(highlights.some((span) => span.type === 'keyword'))
assert.ok(highlights.some((span) => span.type === 'string'))

const keywordSource = [
  'module demo',
  'func inspect(package: String, view: String, ref: String, mut: String) {',
  '    fin shared = package',
  '    fin weak = view',
  '    trace { "${self} ${it} ${ref} ${mut} ${shared} ${weak}" }',
  '}',
].join('\n')
const keywordHighlights = await invokeJson('azlsHighlight', [keywordSource, corpus])
const highlightedKeywords = keywordHighlights
  .filter((span) => span.type === 'keyword')
  .map((span) => keywordSource.slice(span.start, span.end))
assert.ok(highlightedKeywords.includes('module'))
assert.ok(highlightedKeywords.includes('func'))
assert.ok(highlightedKeywords.includes('fin'))
assert.ok(highlightedKeywords.includes('trace'))
for (const contextual of ['package', 'view', 'ref', 'mut', 'shared', 'weak', 'self', 'it']) {
  assert.equal(
    highlightedKeywords.includes(contextual),
    false,
    `${contextual} must not be highlighted as an Azora keyword`,
  )
}

const contextualWhereSource = [
  'pack<T> Box where T == String { fin value: T }',
  'func where(): Int { return 1 }',
  'func main() {',
  '    fin where = 2',
  '    trace { "${where}" }',
  '}',
].join('\n')
const contextualWhereHighlights = await invokeJson(
  'azlsHighlight',
  [contextualWhereSource, corpus],
)
const highlightedWhere = contextualWhereHighlights
  .filter((span) =>
    contextualWhereSource.slice(span.start, span.end) === 'where')
  .map((span) => span.type)
assert.deepEqual(
  highlightedWhere,
  ['keyword', 'function', 'variable', 'variable'],
  '`where` must be a keyword only in a declaration constraint',
)

const interpolationSource = [
  'pack App { var name: String }',
  'impl App {',
  '    func greet(): String { self& ->',
  '        return "Hello from ${self.name}!"',
  '    }',
  '}',
].join('\n')
const interpolationHighlights = await invokeJson('azlsHighlight', [interpolationSource, corpus])
const interpolationText = (span) => interpolationSource.slice(span.start, span.end)
assert.ok(
  interpolationHighlights.some((span) =>
    span.type === 'parameter' && interpolationText(span) === 'self'
  ),
  'the receiver inside an interpolation must retain parameter highlighting',
)
assert.ok(
  interpolationHighlights.some((span) =>
    span.type === 'variable' && interpolationText(span) === 'name'
  ),
  'a member inside an interpolation must retain variable highlighting',
)
assert.equal(
  interpolationHighlights.some((span) =>
    span.type === 'string' && interpolationText(span).includes('self.name')
  ),
  false,
  'interpolation expressions must not be covered by a string span',
)
assert.deepEqual(
  interpolationHighlights
    .filter((span) => span.type === 'interpolation-punctuation')
    .map(interpolationText),
  ['$', '{', '}'],
)

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

const usageSource = [
  'prop title: String = "Azora"',
  'prop subtitle: String = "Language"',
  'prop footer: String = "Unused"',
  'func render(name: String, unusedParameter: String): String {',
  '    fin greeting = name',
  '    fin unusedLocal = subtitle',
  '    return greeting + title',
  '}',
  'func unusedHelper(): Int { return 1 }',
  'func main() { render("Azora", "unused") }',
].join('\n')
const usageHighlights = classifySemanticHighlights(
  usageSource,
  await invokeJson('azlsHighlight', [usageSource, corpus]),
)
const usageTokens = usageHighlights.map((span) => ({
  type: span.type,
  text: usageSource.slice(span.start, span.end),
}))
assert.ok(usageTokens.some((token) => token.type === 'parameter' && token.text === 'name'))
assert.ok(usageTokens.some((token) =>
  token.type === 'unused-parameter' && token.text === 'unusedParameter'))
assert.ok(usageTokens.some((token) => token.type === 'unused' && token.text === 'unusedLocal'))
assert.ok(usageTokens.some((token) => token.type === 'unused' && token.text === 'unusedHelper'))
assert.ok(usageTokens.some((token) => token.type === 'property' && token.text === 'title'))
assert.ok(usageTokens.some((token) =>
  token.type === 'property' && token.text === 'subtitle'))
assert.ok(usageTokens.some((token) =>
  token.type === 'unused-property' && token.text === 'footer'))

const genericSource = [
  'pack<K, V> Pair {',
  '    fin first: K',
  '    fin second: V',
  '}',
  'impl<T> PrettyPrint for Pair {',
  '    prop<D> metadata: D',
  '}',
  'func<T> identity(value: T): T { return value }',
].join('\n')
const genericHighlights = classifySemanticHighlights(
  genericSource,
  await invokeJson('azlsHighlight', [genericSource, corpus]),
)
const genericTokens = genericHighlights.map((span) => ({
  type: span.type,
  text: genericSource.slice(span.start, span.end),
}))
for (const name of ['K', 'V', 'T', 'D']) {
  const occurrences = genericTokens.filter((token) => token.text === name)
  assert.ok(occurrences.length > 0, `generic ${name} must be highlighted`)
  assert.ok(
    occurrences.every((token) => token.type === 'generic'),
    `generic ${name} declarations and references must use generic highlighting: ${JSON.stringify(occurrences)}`,
  )
}
assert.ok(
  genericTokens.some((token) => token.type === 'type' && token.text === 'Pair'),
  'concrete declared types must retain type highlighting',
)

const specSource = [
  'spec Clock {',
  '    func now(): Int',
  '    func orphaned(): Int',
  '    prop ticks: Int',
  '}',
  'pack SystemClock',
  'impl Clock for SystemClock {',
  '    func now(): Int { return 1 }',
  '    prop ticks: Int = 1',
  '}',
  'friend zone std { }',
  'func main() {',
  '    std::println(Clock)',
  '    std::println(SystemClock().now())',
  '    std::println(SystemClock().ticks)',
  '}',
].join('\n')
const specHighlights = classifySemanticHighlights(
  specSource,
  await invokeJson('azlsHighlight', [specSource, corpus]),
)
const typeAt = (offset) =>
  specHighlights.find((span) => span.start === offset)?.type
const specNow = specSource.indexOf('now')
const overrideNow = specSource.indexOf('now', specNow + 1)
const specTicks = specSource.indexOf('ticks')
const overrideTicks = specSource.indexOf('ticks', specTicks + 1)
const orphaned = specSource.indexOf('orphaned')
assert.equal(typeAt(specNow), 'spec-function')
assert.equal(typeAt(overrideNow), 'override-function')
assert.equal(typeAt(specTicks), 'spec-property')
assert.equal(typeAt(overrideTicks), 'override-property')
assert.equal(typeAt(orphaned), 'unused-spec-function')
for (const clock of [...specSource.matchAll(/\bClock\b/g)]) {
  assert.equal(typeAt(clock.index), 'spec-type')
}
const specZoneOffsets = [...specSource.matchAll(/\bstd\b/g)].map((match) => match.index)
assert.equal(specZoneOffsets.length, 4)
assert.notEqual(typeAt(specZoneOffsets[0]), 'zone')
for (const offset of specZoneOffsets.slice(1)) {
  assert.equal(typeAt(offset), 'zone')
}

const zoneContextSource = [
  'module demo',
  'import std.io',
  'import std.container.tuple',
  'func main() { std::println("ok") }',
].join('\n')
const zoneContextHighlights = classifySemanticHighlights(
  zoneContextSource,
  await invokeJson('azlsHighlight', [zoneContextSource, corpus]),
)
const stdOffsets = [...zoneContextSource.matchAll(/\bstd\b/g)].map((match) => match.index)
assert.equal(stdOffsets.length, 3)
assert.equal(
  zoneContextHighlights.find((span) => span.start === stdOffsets[0])?.type,
  'module-path',
  'an imported module path must receive module styling',
)
assert.equal(
  zoneContextHighlights.find((span) => span.start === stdOffsets[1])?.type,
  'module-path',
  'a nested imported module path must receive module styling',
)
assert.equal(
  zoneContextHighlights.find((span) => span.start === stdOffsets[2])?.type,
  'zone',
  'an identifier participating in :: access must be styled as a zone',
)
for (const name of ['io', 'container', 'tuple']) {
  const offset = zoneContextSource.indexOf(name)
  assert.equal(
    zoneContextHighlights.find((span) => span.start === offset)?.type,
    'module-path',
    `the ${name} module path segment must receive module styling`,
  )
}

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

for (const example of engineExamples) {
  const { highlights: exampleHighlights } = await highlightInChunks(example.code)
  assert.ok(
    exampleHighlights.some((span) => span.type === 'keyword'),
    `${example.title} must receive AZLS semantic highlighting`,
  )
  assert.ok(
    exampleHighlights.some((span) => span.type === 'function'),
    `${example.title} must resolve known engine functions`,
  )
}

const racingExample = engineExamples.find((example) => example.title === 'Racing Game')
const racingContext = workspaceIndex.contextFor(racingExample.code)
const racingPaths = racingContext.documentIds.map((id) => workspace.documents[id].path)
assert.ok(racingPaths.includes('engine/render/render.az'))
assert.ok(racingPaths.includes('engine/shaders/shaders.az'))
assert.ok(racingPaths.includes('engine/input/input.az'))
assert.ok(racingPaths.includes('std/math.az'))

const boxAtOffset = racingExample.code.indexOf('engine::boxAt') + 'engine::'.length + 2
const boxAtDefinition = await invokeJson('azlsDefinition', [
  racingExample.code,
  boxAtOffset,
  racingContext.corpus,
])
assert.equal(boxAtDefinition.found, true)
assert.equal(
  workspace.documents[racingContext.documentIds[boxAtDefinition.document]].path,
  'engine/render/render.az',
)

const renderDocument = workspace.documents.find(
  (document) => document.path === 'engine/render/render.az',
)
const renderContext = workspaceIndex.contextFor(renderDocument.source)
const renderSinOffset = renderDocument.source.indexOf('std::math::sin') + 'std::math::'.length + 1
const renderSinHover = await invokeJson('azlsHover', [
  renderDocument.source,
  renderSinOffset,
  renderContext.corpus,
])
assert.equal(renderSinHover.found, true)
assert.equal(
  workspace.documents[renderContext.documentIds[renderSinHover.document]].path,
  'std/math.az',
)

const tupleDocument = workspace.documents.find(
  (document) => document.path === 'std/container/tuple.az',
)
const tupleContext = workspaceIndex.contextFor(tupleDocument.source)
const prettyPrintOffset = tupleDocument.source.indexOf('PrettyPrint')
const prettyPrintDefinition = await invokeJson('azlsDefinition', [
  tupleDocument.source,
  prettyPrintOffset + 2,
  tupleContext.corpus,
])
assert.equal(
  prettyPrintDefinition.found,
  true,
  'a spec used from within the same friend zone must resolve',
)
assert.equal(
  workspace.documents[tupleContext.documentIds[prettyPrintDefinition.document]].path,
  'std/traits/traits.az',
)
const { highlights: tupleHighlights } = await highlightInChunks(tupleDocument.source)
assert.equal(
  tupleHighlights.some((span) =>
    span.start === prettyPrintOffset &&
    span.type === 'spec-type' &&
    tupleDocument.source.slice(span.start, span.end) === 'PrettyPrint'
  ),
  true,
  'an imported spec reference must retain its spec semantic kind',
)
const classifiedTupleHighlights = classifySemanticHighlights(
  tupleDocument.source,
  tupleHighlights,
)
const tupleZoneDeclaration = tupleDocument.source.indexOf('friend zone std') +
  'friend zone '.length
assert.equal(
  tupleHighlights.find((span) => span.start === tupleZoneDeclaration)?.type,
  'identifier',
  'AZLS must keep a named zone declaration as ordinary declaration text',
)
assert.notEqual(
  classifiedTupleHighlights.find((span) => span.start === tupleZoneDeclaration)?.type,
  'zone',
  'a named zone declaration must not receive zone-use styling',
)

for (const path of ['engine/render/render.az', 'std/serializer.az']) {
  const document = workspace.documents.find((candidate) => candidate.path === path)
  const { highlights: documentHighlights } = await highlightInChunks(document.source)
  assert.ok(
    documentHighlights.length > 0,
    `${path} must remain highlighted when opened as a read-only definition`,
  )
  assert.ok(
    documentHighlights.some((span) => span.type === 'function'),
    `${path} must retain function semantics when opened`,
  )
}

console.log(`AZLS ${version}: ${workspace.documents.length} std documents and all ABI checks passed.`)
