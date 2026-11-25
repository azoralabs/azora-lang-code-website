const FIELD_MARKER = '<:AZLS-FIELD:>'
const RECORD_MARKER = '<:AZLS-RECORD:>'
const HIGHLIGHT_CHUNK_SIZE = 512

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
    /^\s*(exposed\s+)?module\s+([A-Za-z_][A-Za-z0-9_.]*)/m,
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

export async function loadAzoraLanguageServer(version, signal, onFailure) {
  const basePath = `${import.meta.env.BASE_URL}azls/${version}`
  const abort = new AbortController()
  const worker = new Worker(new URL('./azlsWorker.js', import.meta.url), { type: 'module' })
  const lifetime = abort.signal
  let ready = false

  function close(error) {
    if (lifetime.aborted) return
    abort.abort(error)
    worker.terminate()
    if (ready && !signal.aborted) onFailure(error)
  }

  worker.onerror = () => close(new Error('AZLS worker failed'))
  if (signal.aborted) close(signal.reason)
  else signal.addEventListener('abort', () => close(signal.reason), { once: true })

  function request(message) {
    lifetime.throwIfAborted()
    return new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel()
      const onClose = () => {
        cleanup()
        reject(lifetime.reason)
      }
      const cleanup = () => {
        clearTimeout(timer)
        lifetime.removeEventListener('abort', onClose)
        port1.close()
      }
      const timer = setTimeout(() => close(new Error('AZLS stopped responding')), 8000)
      lifetime.addEventListener('abort', onClose, { once: true })
      port1.onmessage = ({ data: { result, error } }) => {
        cleanup()
        if (error) reject(new Error(error))
        else resolve(result)
      }
      worker.postMessage(message, [port2])
    })
  }

  let documents
  try {
    const workspace = fetch(`${basePath}/stdlib.json`, { cache: 'no-store', signal: lifetime })
      .then((response) => {
        if (!response.ok) throw new Error(`AZLS stdlib workspace could not be loaded (${response.status})`)
        return response.json()
      })
    const wasmUrl = new URL(`${basePath}/azls.wasm`, document.baseURI).href
    const [loaded] = await Promise.all([workspace, request({ wasmUrl })])
    documents = Object.freeze(loaded.documents || [])
  } catch (error) {
    close(error)
    throw error
  }
  const workspaceIndex = createAzlsWorkspace(documents)
  ready = true

  async function invokeJson(exportName, args) {
    const response = await request({ exportName, args })
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
