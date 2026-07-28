const FIELD_MARKER = '<:AZLS-FIELD:>'
const RECORD_MARKER = '<:AZLS-RECORD:>'
const WASM_PAGE_BYTES = 64 * 1024
const MIN_REQUEST_MEMORY_BYTES = 4 * 1024 * 1024
const HIGHLIGHT_CHUNK_SIZE = 512
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function wasmImports() {
  const ignore = () => {}
  return {
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
}

function writeString(exports, value) {
  const bytes = textEncoder.encode(value)
  const pointer = exports.azlsReserve(bytes.length)
  new Uint8Array(exports.memory.buffer, pointer + 4, bytes.length).set(bytes)
  return pointer
}

function readString(exports, pointer) {
  const length = new DataView(exports.memory.buffer).getInt32(pointer, true)
  return textDecoder.decode(new Uint8Array(exports.memory.buffer, pointer + 4, length))
}

function documentSource(documents, activeSource, documentId) {
  if (documentId === -1) return activeSource
  return documents[documentId]?.source || ''
}

function resolveRange(documents, activeSource, documentIds, response) {
  if (!response?.found) return null
  const documentId = response.document === -1
    ? -1
    : documentIds[response.document]
  const document = documentId === -1
    ? { id: -1, uri: 'azora-playground:///main.az', path: 'main.az', source: activeSource }
    : { id: documentId, ...documents[documentId] }
  if (!document?.source) return null
  return { ...response, document }
}

function moduleMetadata(document, id) {
  const declaration = document.source.match(
    /^\s*(export\s+)?module\s+([A-Za-z_][A-Za-z0-9_.]*)/m,
  )
  return Object.freeze({
    ...document,
    id,
    module: declaration?.[2] || '',
    exported: Boolean(declaration?.[1]),
  })
}

function importedModules(source) {
  const modules = []
  const statement = /^\s*(?:import|use)\s+([^\n\r/]+)/gm
  let match
  while ((match = statement.exec(source)) != null) {
    const clause = match[1].trim()
    if (clause.startsWith('zone ') || clause.startsWith('friend zone ')) continue

    const grouped = clause.match(
      /^([A-Za-z_][A-Za-z0-9_.]*)\.\{([^}]+)\}/,
    )
    if (grouped) {
      for (const child of grouped[2].split(',')) {
        const name = child.trim()
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
          modules.push(`${grouped[1]}.${name}`)
        }
      }
      continue
    }

    const plain = clause.match(
      /^([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*(?:\.\*)?)/,
    )
    if (plain) modules.push(plain[1])
  }
  return modules
}

function moduleMatches(requested, candidate) {
  if (requested.endsWith('.*')) {
    return candidate.startsWith(requested.slice(0, -1))
  }
  return requested === candidate
}

export function createAzlsWorkspace(documents) {
  const metadata = documents.map(moduleMetadata)
  const exportedDocuments = metadata.filter((document) => document.exported)
  const corpusCache = new Map()

  function contextFor(source) {
    const selected = new Map(
      exportedDocuments.map((document) => [document.id, document]),
    )
    const pending = [...importedModules(source)]
    const visitedModules = new Set()

    for (let index = 0; index < pending.length; index += 1) {
      const requested = pending[index]
      if (visitedModules.has(requested)) continue
      visitedModules.add(requested)

      for (const document of metadata) {
        if (!document.module || !moduleMatches(requested, document.module)) continue
        if (!selected.has(document.id)) {
          selected.set(document.id, document)
          pending.push(...importedModules(document.source))
        }
      }
    }

    const visibleDocuments = [...selected.values()].sort((left, right) => left.id - right.id)
    const documentIds = visibleDocuments.map((document) => document.id)
    const cacheKey = documentIds.join(',')
    let corpus = corpusCache.get(cacheKey)
    if (corpus == null) {
      corpus = visibleDocuments.map((document) =>
        `${document.uri}${FIELD_MARKER}${document.source}${RECORD_MARKER}`,
      ).join('')
      corpusCache.set(cacheKey, corpus)
    }
    return Object.freeze({ corpus, documentIds: Object.freeze(documentIds) })
  }

  return Object.freeze({ contextFor })
}

function growRequestMemory(exports, args) {
  const inputBytes = args.reduce((total, argument) => (
    total + (typeof argument === 'string' ? textEncoder.encode(argument).length + 4 : 0)
  ), 0)
  const desiredBytes = Math.max(
    MIN_REQUEST_MEMORY_BYTES,
    inputBytes * 8 + WASM_PAGE_BYTES,
  )
  const missingBytes = desiredBytes - exports.memory.buffer.byteLength
  if (missingBytes > 0) {
    exports.memory.grow(Math.ceil(missingBytes / WASM_PAGE_BYTES))
  }
}

export async function loadAzoraLanguageServer(version) {
  const basePath = `${import.meta.env.BASE_URL}azls/${version}`
  const [wasmResponse, workspaceResponse] = await Promise.all([
    fetch(`${basePath}/azls.wasm`),
    fetch(`${basePath}/stdlib.json`),
  ])

  if (!wasmResponse.ok) {
    throw new Error(`AZLS WASM could not be loaded (${wasmResponse.status})`)
  }
  if (!workspaceResponse.ok) {
    throw new Error(`AZLS stdlib workspace could not be loaded (${workspaceResponse.status})`)
  }

  const [module, workspace] = await Promise.all([
    WebAssembly.compile(await wasmResponse.arrayBuffer()),
    workspaceResponse.json(),
  ])
  const documents = Object.freeze(workspace.documents || [])
  const workspaceIndex = createAzlsWorkspace(documents)

  async function invoke(exportName, args) {
    // Azora's current WASM allocator is intentionally monotonic. A fresh,
    // cheaply-instantiated module per request gives every analysis operation a
    // bounded arena while WebAssembly.compile remains cached for this version.
    const instance = await WebAssembly.instantiate(module, wasmImports())
    const exports = instance.exports
    growRequestMemory(exports, args)
    const wasmArgs = args.map((argument) =>
      typeof argument === 'string' ? writeString(exports, argument) : argument,
    )
    const pointer = exports[exportName](...wasmArgs)
    return readString(exports, pointer)
  }

  async function invokeJson(exportName, args) {
    const response = await invoke(exportName, args)
    try {
      return JSON.parse(response)
    } catch (error) {
      throw new Error(`AZLS returned invalid JSON from ${exportName}: ${error.message}`)
    }
  }

  return Object.freeze({
    version,
    documents,

    async highlight(source) {
      const { corpus } = workspaceIndex.contextFor(source)
      const highlights = []
      for (let start = 0; start < source.length; start += HIGHLIGHT_CHUNK_SIZE) {
        const end = Math.min(source.length, start + HIGHLIGHT_CHUNK_SIZE)
        const chunk = await invokeJson('azlsHighlightRange', [source, corpus, start, end])
        highlights.push(...chunk.filter((span) => span.start >= start && span.start < end))
      }
      return highlights
    },

    diagnostics(source) {
      return invokeJson('azlsDiagnostics', [source])
    },

    async definition(source, offset) {
      const context = workspaceIndex.contextFor(source)
      const response = await invokeJson('azlsDefinition', [source, offset, context.corpus])
      return resolveRange(documents, source, context.documentIds, response)
    },

    async hover(source, offset) {
      const context = workspaceIndex.contextFor(source)
      const response = await invokeJson('azlsHover', [source, offset, context.corpus])
      return resolveRange(documents, source, context.documentIds, response)
    },

    async complete(source, offset) {
      const context = workspaceIndex.contextFor(source)
      const items = await invokeJson('azlsComplete', [source, offset, context.corpus])
      return items.map((item) => {
        const documentId = item.document === -1
          ? -1
          : context.documentIds[item.document]
        const itemSource = documentSource(documents, source, documentId)
        return {
          ...item,
          document: documentId,
          label: itemSource.slice(item.start, item.end),
          detail: itemSource.slice(item.detailStart, item.detailEnd).trim(),
        }
      })
    },

    symbols(source) {
      return invokeJson('azlsSymbols', [source])
    },
  })
}
