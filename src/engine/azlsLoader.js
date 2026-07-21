const FIELD_MARKER = '<:AZLS-FIELD:>'
const RECORD_MARKER = '<:AZLS-RECORD:>'
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

function resolveRange(documents, activeSource, response) {
  if (!response?.found) return null
  const document = response.document === -1
    ? { id: -1, uri: 'azora-playground:///main.az', path: 'main.az', source: activeSource }
    : { id: response.document, ...documents[response.document] }
  if (!document?.source) return null
  return { ...response, document }
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
  const corpus = documents.map((document) =>
    `${document.uri}${FIELD_MARKER}${document.source}${RECORD_MARKER}`,
  ).join('')

  async function invoke(exportName, args) {
    // Azora's current WASM allocator is intentionally monotonic. A fresh,
    // cheaply-instantiated module per request gives every analysis operation a
    // bounded arena while WebAssembly.compile remains cached for this version.
    const instance = await WebAssembly.instantiate(module, wasmImports())
    const exports = instance.exports
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

    highlight(source) {
      return invokeJson('azlsHighlight', [source])
    },

    diagnostics(source) {
      return invokeJson('azlsDiagnostics', [source])
    },

    async definition(source, offset) {
      const response = await invokeJson('azlsDefinition', [source, offset, corpus])
      return resolveRange(documents, source, response)
    },

    async hover(source, offset) {
      const response = await invokeJson('azlsHover', [source, offset, corpus])
      return resolveRange(documents, source, response)
    },

    async complete(source, offset) {
      const items = await invokeJson('azlsComplete', [source, offset, corpus])
      return items.map((item) => {
        const itemSource = documentSource(documents, source, item.document)
        return {
          ...item,
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
