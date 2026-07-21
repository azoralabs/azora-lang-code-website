import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { azoraTheme } from '../codemirror/azora-theme.js'
import { azlsExtensions } from '../codemirror/azls.js'

export default function CodeEditor({
  document,
  onChange,
  onRun,
  onRunTests,
  languageServer,
  onDefinition,
  navigation,
}) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  const onRunTestsRef = useRef(onRunTests)
  const onDefinitionRef = useRef(onDefinition)

  onChangeRef.current = onChange
  onRunRef.current = onRun
  onRunTestsRef.current = onRunTests
  onDefinitionRef.current = onDefinition

  useEffect(() => {
    if (!containerRef.current) return undefined

    const goToDefinition = (view) => {
      if (!languageServer) return false
      const position = view.state.selection.main.head
      languageServer.definition(view.state.doc.toString(), position).then((target) => {
        if (target) onDefinitionRef.current?.(target)
      })
      return true
    }

    const state = EditorState.create({
      doc: document.source,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        azoraTheme,
        EditorState.tabSize.of(4),
        EditorState.readOnly.of(Boolean(document.readOnly)),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          indentWithTab,
          { key: 'Mod-Enter', run: () => { onRunRef.current?.(); return true } },
          { key: 'Mod-Shift-Enter', run: () => { onRunTestsRef.current?.(); return true } },
          { key: 'F12', run: goToDefinition },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !document.readOnly) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        }),
        ...azlsExtensions(languageServer, (target) => onDefinitionRef.current?.(target)),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [document.uri, document.readOnly, languageServer])

  useEffect(() => {
    const view = viewRef.current
    if (!view || document.readOnly) return
    const currentSource = view.state.doc.toString()
    if (document.source !== currentSource) {
      view.dispatch({ changes: { from: 0, to: currentSource.length, insert: document.source } })
    }
  }, [document.source, document.readOnly])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !navigation || navigation.uri !== document.uri) return
    const anchor = Math.max(0, Math.min(view.state.doc.length, navigation.start))
    const head = Math.max(anchor, Math.min(view.state.doc.length, navigation.end))
    view.dispatch({
      selection: { anchor, head },
      effects: EditorView.scrollIntoView(anchor, { y: 'center' }),
    })
    view.focus()
  }, [document.uri, navigation])

  return <div ref={containerRef} className="h-full overflow-auto" />
}
