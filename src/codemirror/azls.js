import { autocompletion } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { setDiagnostics } from '@codemirror/lint'
import { Decoration, EditorView, ViewPlugin, hoverTooltip } from '@codemirror/view'

const setHighlights = StateEffect.define()

const semanticHighlights = StateField.define({
  create: () => Decoration.none,
  update(highlights, transaction) {
    let next = highlights.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (effect.is(setHighlights)) next = effect.value
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

function highlightDecorations(spans, documentLength) {
  const ranges = spans.flatMap((span) => {
    const from = Math.max(0, Math.min(documentLength, span.start))
    const to = Math.max(from, Math.min(documentLength, span.end))
    if (from === to) return []
    return [Decoration.mark({ class: `cm-azls-${span.type}` }).range(from, to)]
  })
  return Decoration.set(ranges, true)
}

function editorDiagnostics(state, diagnostics) {
  return diagnostics.map((diagnostic) => {
    const lineNumber = Math.max(1, Math.min(state.doc.lines, diagnostic.line || 1))
    const line = state.doc.line(lineNumber)
    return {
      from: line.from,
      to: Math.max(line.from, line.to),
      severity: diagnostic.severity || 'error',
      message: diagnostic.message,
      source: 'AZLS',
    }
  })
}

function analysisPlugin(server) {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.generation = 0
      this.timer = null
      this.schedule(view, 0)
    }

    update(update) {
      if (update.docChanged) this.schedule(update.view, 90)
    }

    schedule(view, delay) {
      this.generation += 1
      const generation = this.generation
      clearTimeout(this.timer)
      this.timer = setTimeout(async () => {
        const source = view.state.doc.toString()
        try {
          const [highlights, diagnostics] = await Promise.all([
            server.highlight(source),
            server.diagnostics(source),
          ])
          if (generation !== this.generation || view.state.doc.toString() !== source) return
          view.dispatch({
            effects: setHighlights.of(highlightDecorations(highlights, view.state.doc.length)),
          })
          view.dispatch(setDiagnostics(view.state, editorDiagnostics(view.state, diagnostics)))
        } catch (error) {
          if (generation !== this.generation) return
          view.dispatch(setDiagnostics(view.state, [{
            from: 0,
            to: 0,
            severity: 'warning',
            source: 'AZLS',
            message: error.message || String(error),
          }]))
        }
      }, delay)
    }

    destroy() {
      this.generation += 1
      clearTimeout(this.timer)
    }
  })
}

function completionKind(kind) {
  if (kind === 'interface') return 'interface'
  if (kind === 'annotation') return 'keyword'
  if (kind === 'property') return 'property'
  if (kind === 'variable') return 'variable'
  if (kind === 'enum') return 'enum'
  if (kind === 'type') return 'class'
  return 'function'
}

function completions(server) {
  return autocompletion({
    override: [async (context) => {
      const prefix = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*|[A-Za-z0-9_]*/)
      if (!context.explicit && (!prefix || prefix.from === prefix.to)) return null
      const items = await server.complete(context.state.doc.toString(), context.pos)
      return {
        from: prefix?.from ?? context.pos,
        validFor: /^[A-Za-z_][A-Za-z0-9_]*$/,
        options: items.map((item) => ({
          label: item.label,
          type: completionKind(item.kind),
          detail: item.detail,
          boost: item.document === -1 ? 10 : 0,
        })),
      }
    }],
  })
}

function hovers(server) {
  return hoverTooltip(async (view, position) => {
    const target = await server.hover(view.state.doc.toString(), position)
    if (!target) return null
    const detail = target.document.source.slice(target.detailStart, target.detailEnd).trim()
    return {
      pos: position,
      above: true,
      create() {
        const dom = document.createElement('div')
        dom.className = 'azls-hover'
        const path = document.createElement('div')
        path.className = 'azls-hover-path'
        path.textContent = target.document.path
        const signature = document.createElement('pre')
        signature.textContent = detail
        dom.append(path, signature)
        return { dom }
      },
    }
  }, { hoverTime: 300 })
}

function usesDefinitionModifier(event) {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  return isMac ? event.metaKey : event.ctrlKey
}

function definitionClicks(server, onDefinition) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button !== 0 || !usesDefinitionModifier(event)) return false
      const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (position == null) return false
      event.preventDefault()
      server.definition(view.state.doc.toString(), position).then((target) => {
        if (target) onDefinition?.(target)
      })
      return true
    },
  })
}

export function azlsExtensions(server, onDefinition) {
  if (!server) return []
  return [
    semanticHighlights,
    analysisPlugin(server),
    completions(server),
    hovers(server),
    definitionClicks(server, onDefinition),
  ]
}
