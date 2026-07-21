import { useState, useCallback, useEffect, useMemo } from 'react'
import Header from './components/Header.jsx'
import CodeEditor from './components/CodeEditor.jsx'
import OutputPanel from './components/OutputPanel.jsx'
import useAzoraEngine from './hooks/useAzoraEngine.js'
import useAzoraLanguageServer from './hooks/useAzoraLanguageServer.js'
import { SAMPLE_CODE } from './data/sampleCode.js'
import { getDefaultVersion, isValidVersion } from './engine/versions.js'
import { runJavaScript } from './engine/javascriptRunner.js'
import { runLlvmIr } from './engine/llvmRunner.js'
import { errorMessage } from './engine/errorMessage.js'

const LS_CODE_KEY = 'azora-playground-code'
const LS_VERSION_KEY = 'azora-playground-version'
const LS_TARGET_KEY = 'azora-playground-target'
const ACTIVE_TARGETS = new Set(['interpreted', 'javascript', 'wasm', 'llvm-ir'])
const EMPTY_RESULTS = { console: [], preprocessed: '', javascript: '', llvmIr: '', wasm: '' }
const PLAYGROUND_URI = 'azora-playground:///main.az'

function loadSaved(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? v : fallback
  } catch {
    return fallback
  }
}

function loadTarget() {
  const saved = loadSaved(LS_TARGET_KEY, 'interpreted')
  return ACTIVE_TARGETS.has(saved) ? saved : 'interpreted'
}

export default function App() {
  const [code, setCode] = useState(() => loadSaved(LS_CODE_KEY, SAMPLE_CODE))
  const [version, setVersion] = useState(() => {
    const saved = loadSaved(LS_VERSION_KEY, getDefaultVersion())
    return isValidVersion(saved) ? saved : getDefaultVersion()
  })
  const [target, setTarget] = useState(loadTarget)
  const [activeTab, setActiveTab] = useState('console')
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState(EMPTY_RESULTS)
  const [activeStdDocument, setActiveStdDocument] = useState(null)
  const [navigation, setNavigation] = useState(null)

  const engine = useAzoraEngine(version)
  const azls = useAzoraLanguageServer(version)

  const editorDocument = useMemo(() => {
    if (activeStdDocument == null || !azls.server?.documents[activeStdDocument]) {
      return { uri: PLAYGROUND_URI, path: 'main.az', source: code, readOnly: false }
    }
    return { ...azls.server.documents[activeStdDocument], readOnly: true }
  }, [activeStdDocument, azls.server, code])

  useEffect(() => {
    try { localStorage.setItem(LS_CODE_KEY, code) } catch {}
  }, [code])

  useEffect(() => {
    try { localStorage.setItem(LS_VERSION_KEY, version) } catch {}
    setActiveStdDocument(null)
  }, [version])

  useEffect(() => {
    const safeTarget = ACTIVE_TARGETS.has(target) ? target : 'interpreted'
    if (safeTarget !== target) {
      setTarget(safeTarget)
      return
    }
    try { localStorage.setItem(LS_TARGET_KEY, safeTarget) } catch {}
    setResults(prev => ({ ...prev, console: [] }))
    if (safeTarget !== 'javascript' && activeTab === 'javascript') setActiveTab('console')
    if (safeTarget !== 'llvm-ir' && activeTab === 'llvm-ir') setActiveTab('console')
    if (safeTarget !== 'wasm' && activeTab === 'wasm') setActiveTab('console')
  }, [target, activeTab])

  useEffect(() => {
    if (!engine.ready) return
    try {
      const ppResult = engine.preprocess(code)
      setResults(prev => ({
        ...prev,
        preprocessed: ppResult.success ? ppResult.output.trimEnd() : `// Error:\n// ${ppResult.errors}`,
      }))
    } catch {}
  }, [code, engine.ready, engine])

  useEffect(() => {
    if (!engine.ready || target !== 'javascript') return
    try {
      const jsResult = engine.generateJavaScript(code)
      setResults(prev => ({
        ...prev,
        javascript: jsResult.success ? jsResult.output : `// Error:\n// ${jsResult.errors}`,
      }))
    } catch {}
  }, [code, target, engine.ready, engine])

  useEffect(() => {
    if (!engine.ready || target !== 'llvm-ir') return
    try {
      const irResult = engine.generateLlvmIr(code)
      setResults(prev => ({
        ...prev,
        llvmIr: irResult.success ? irResult.output : `; Error:\n; ${irResult.errors}`,
      }))
    } catch {}
  }, [code, target, engine.ready, engine])

  useEffect(() => {
    if (!engine.ready || target !== 'wasm') return
    try {
      const waResult = engine.generateWasm(code)
      setResults(prev => ({
        ...prev,
        wasm: waResult.success ? waResult.output : `;; Error:\n;; ${waResult.errors}`,
      }))
    } catch {}
  }, [code, target, engine.ready, engine])

  const parseOutput = useCallback((result) => {
    const messages = []
    if (result.output) {
      result.output.split('\n').forEach((line) => {
        if (line) messages.push({ text: line, type: 'output' })
      })
    }
    if (result.errors) {
      result.errors.split('\n').forEach((line) => {
        if (line) messages.push({ text: line, type: 'error' })
      })
    }
    return messages
  }, [])

  const handleRun = useCallback(async () => {
    if (!engine.ready || isRunning) return
    setIsRunning(true)
    setActiveTab('console')

    try {
      if (target === 'javascript') {
        const jsResult = engine.generateJavaScript(code)
        const javascriptCode = jsResult.success ? jsResult.output : null

        setResults(prev => ({
          ...prev,
          javascript: jsResult.success ? jsResult.output : `// Error:\n// ${jsResult.errors}`,
        }))

        if (!javascriptCode) {
          setResults(prev => ({
            ...prev,
            console: [{ text: `JavaScript codegen failed: ${jsResult.errors}`, type: 'error' }],
          }))
          return
        }

        const runResult = await runJavaScript(javascriptCode)
        setResults(prev => ({ ...prev, console: parseOutput(runResult) }))
      } else if (target === 'llvm-ir') {
        const irResult = engine.generateLlvmIr(code)
        const llvmIrCode = irResult.success ? irResult.output : null

        setResults(prev => ({
          ...prev,
          llvmIr: irResult.success ? irResult.output : `; Error:\n; ${irResult.errors}`,
        }))

        if (!llvmIrCode) {
          setResults(prev => ({
            ...prev,
            console: [{ text: `LLVM IR codegen failed: ${irResult.errors}`, type: 'error' }],
          }))
          return
        }

        setResults(prev => ({
          ...prev,
          console: [{ text: 'Compiling and running via LLVM...', type: 'output' }],
        }))

        const runResult = await runLlvmIr(llvmIrCode)
        setResults(prev => ({ ...prev, console: parseOutput(runResult) }))
      } else if (target === 'wasm') {
        const waResult = engine.generateWasm(code)
        setResults(prev => ({
          ...prev,
          wasm: waResult.success ? waResult.output : `;; Error:\n;; ${waResult.errors}`,
        }))
        if (!waResult.success) {
          setResults(prev => ({
            ...prev,
            console: [{ text: `WebAssembly codegen failed: ${waResult.errors}`, type: 'error' }],
          }))
          return
        }
        setResults(prev => ({
          ...prev,
          console: [{ text: 'Showing generated WebAssembly; running program via the Azora interpreter...', type: 'output' }],
        }))
        const interpretResult = await engine.interpret(code)
        setResults(prev => ({ ...prev, console: parseOutput(interpretResult) }))
      } else {
        const interpretResult = await engine.interpret(code)
        setResults(prev => ({ ...prev, console: parseOutput(interpretResult) }))
      }
    } catch (e) {
      setResults(prev => ({
        ...prev,
        console: [{ text: `Unexpected error: ${errorMessage(e)}`, type: 'error' }],
      }))
    } finally {
      setIsRunning(false)
    }
  }, [code, engine, isRunning, parseOutput, target])

  const handleRunTests = useCallback(async () => {
    if (!engine.ready || isRunning) return
    setIsRunning(true)
    setActiveTab('console')

    try {
      const result = await engine.runTests(code)
      setResults(prev => ({ ...prev, console: parseOutput(result) }))
    } catch (e) {
      setResults(prev => ({
        ...prev,
        console: [{ text: `Unexpected error: ${errorMessage(e)}`, type: 'error' }],
      }))
    } finally {
      setIsRunning(false)
    }
  }, [code, engine, isRunning, parseOutput])

  const handleDefinition = useCallback((target) => {
    if (!target?.document) return
    if (target.document.id === -1) {
      setNavigation({
        uri: editorDocument.uri,
        start: target.start,
        end: target.end,
        nonce: Date.now(),
      })
      return
    }
    const definitionDocument = azls.server?.documents[target.document.id]
    if (!definitionDocument) return
    setActiveStdDocument(target.document.id)
    setNavigation({
      uri: definitionDocument.uri,
      start: target.start,
      end: target.end,
      nonce: Date.now(),
    })
  }, [azls.server, editorDocument.uri])

  const loadExample = useCallback((source) => {
    setCode(source)
    setActiveStdDocument(null)
  }, [])

  if (engine.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-az-90">
        <div className="text-center">
          <div className="text-az-primary font-mono font-bold text-3xl mb-4">Az</div>
          <div className="text-az-50 text-sm">Loading Azora engine...</div>
          <div className="mt-3 w-8 h-8 border-2 border-az-80 border-t-az-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (engine.error) {
    return (
      <div className="h-screen flex items-center justify-center bg-az-90">
        <div className="text-center max-w-md">
          <div className="text-az-primary font-mono font-bold text-3xl mb-4">Az</div>
          <div className="text-pastel-red text-sm mb-2">Failed to load engine</div>
          <div className="text-az-50 text-xs font-mono bg-az-85 rounded p-3">{engine.error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="playground-shell h-screen flex flex-col bg-az-90">
      <Header
        version={version}
        onVersionChange={setVersion}
        target={target}
        onTargetChange={setTarget}
        onRun={handleRun}
        onRunTests={handleRunTests}
        onClear={() => setResults(EMPTY_RESULTS)}
        isRunning={isRunning}
        engineReady={engine.ready}
        onLoadExample={loadExample}
      />

      <div className="playground-workspace flex-1 flex flex-col md:flex-row min-h-0">
        <div className="playground-pane flex-1 min-h-0 min-w-0 border-b md:border-b-0 md:border-r border-az-80">
          <div className="editor-document-shell">
            <div className="editor-document-bar">
              <div className="editor-document-location">
                {activeStdDocument != null && (
                  <button
                    type="button"
                    className="editor-back-button"
                    onClick={() => setActiveStdDocument(null)}
                    title="Return to main.az"
                  >
                    Back
                  </button>
                )}
                <span className="editor-document-path">{editorDocument.path}</span>
                {editorDocument.readOnly && <span className="editor-readonly">Read only</span>}
              </div>
              <span className={`azls-status ${azls.error ? 'is-error' : azls.server ? 'is-ready' : ''}`}>
                {azls.error ? 'AZLS unavailable' : azls.server ? `AZLS ${azls.server.version}` : 'Loading AZLS'}
              </span>
            </div>
            <div className="editor-document-content">
              <CodeEditor
                document={editorDocument}
                onChange={setCode}
                onRun={handleRun}
                onRunTests={handleRunTests}
                languageServer={azls.server}
                onDefinition={handleDefinition}
                navigation={navigation}
              />
            </div>
          </div>
        </div>

        <div className="playground-pane flex-1 min-h-0 min-w-0">
          <OutputPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            results={results}
            target={target}
          />
        </div>
      </div>
    </div>
  )
}
