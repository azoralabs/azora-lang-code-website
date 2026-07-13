import { useState, useCallback, useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { lineNumbers } from '@codemirror/view'
import { azoraTheme, azoraHighlight } from '../codemirror/azora-theme.js'
import { azoraLanguage } from '../codemirror/azora-language.js'

import { javascript } from '@codemirror/lang-javascript'
import { kotlin } from '@codemirror/legacy-modes/mode/clike'

const readOnlyTheme = EditorView.theme({
  '.cm-gutters': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    fontSize: '14px',
    lineHeight: '1.6',
  },
  '.cm-gutters .cm-lineNumbers .cm-gutterElement': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
})

const llvmMode = {
  startState() { return {} },
  token(stream) {
    if (stream.match(/;.*/)) return 'comment'
    if (stream.match(/"[^"]*"/)) return 'string'
    if (stream.match(/c"[^"]*"/)) return 'string'
    if (stream.match(/\b(define|declare|ret|br|call|alloca|store|load|getelementptr|icmp|fcmp|add|sub|mul|sdiv|udiv|fadd|fsub|fmul|fdiv|srem|and|or|xor|shl|ashr|lshr|trunc|zext|sext|bitcast|phi|select|switch|unreachable|inbounds|private|unnamed_addr|constant|global|type|to|label|entry|nuw|nsw|exact)\b/)) return 'keyword'
    if (stream.match(/@[\w.$]+/)) return 'def'
    if (stream.match(/%[\w.$]+/)) return 'variable'
    if (stream.match(/\b(i1|i8|i16|i32|i64|i128|float|double|void|ptr|null|true|false|zeroinitializer|undef)\b/)) return 'type'
    if (stream.match(/\b\d+\.?\d*\b/)) return 'number'
    if (stream.match(/[{}()\[\],=*]/)) return 'punctuation'
    stream.next()
    return null
  },
}

function ReadOnlyCodeMirror({ code, extensions = [] }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: code || '',
      extensions: [
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        azoraTheme,
        azoraHighlight,
        lineNumbers(),
        readOnlyTheme,
        ...extensions,
      ],
    })

    if (viewRef.current) viewRef.current.destroy()
    viewRef.current = new EditorView({ state, parent: containerRef.current })

    return () => {
      if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null }
    }
  }, [code, extensions])

  return <div ref={containerRef} className="h-full overflow-auto" />
}

const languageExtensions = {
  azora: [azoraLanguage],
  javascript: [javascript()],
  wasm: [],
  llvm: [StreamLanguage.define(llvmMode)],
  clike: [StreamLanguage.define(kotlin)],
}

export default function CodeView({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  if (!code) {
    return (
      <div className="h-full flex items-center justify-center text-az-60 text-sm font-mono">
        Run your code to see output here.
      </div>
    )
  }

  const extensions = languageExtensions[language] || []

  return (
    <div className="h-full overflow-auto relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-az-80 text-az-40
                   hover:bg-az-70 hover:text-az-20 opacity-0 group-hover:opacity-100
                   transition-all z-10"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>

      <ReadOnlyCodeMirror code={code} extensions={extensions} />
    </div>
  )
}
