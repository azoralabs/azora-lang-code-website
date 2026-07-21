
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadWasmEngine } from '../engine/wasmLoader.js'

export default function useAzoraEngine(version) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const engineRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    loadWasmEngine(version)
      .then((engine) => {
        if (!cancelled) {
          engineRef.current = engine
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load WASM engine')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [version])

  const preprocess = useCallback((source, library = null) => {
    if (!engineRef.current) return { success: false, output: '', errors: 'Engine not loaded' }
    return engineRef.current.preprocess(source, library)
  }, [])

  const interpret = useCallback(async (source, library = null) => {
    if (!engineRef.current) return { success: false, output: '', errors: 'Engine not loaded' }
    return engineRef.current.interpret(source, library)
  }, [])

  const generateJavaScript = useCallback((source, library = null) => {
    if (!engineRef.current) return { success: false, output: '', errors: 'Engine not loaded' }
    return engineRef.current.generateJavaScript(source, library)
  }, [])

  const generateLlvmIr = useCallback((source, library = null) => {
    if (!engineRef.current) return { success: false, output: '', errors: 'Engine not loaded' }
    return engineRef.current.generateLlvmIr(source, library)
  }, [])

  const generateWasm = useCallback((source, library = null) => {
    if (!engineRef.current) return { success: false, output: '', errors: 'Engine not loaded' }
    return engineRef.current.generateWasm(source, library)
  }, [])

  const runTests = useCallback(async (source, library = null) => {
    if (!engineRef.current) return { success: false, output: '', errors: 'Engine not loaded' }
    return engineRef.current.runTests(source, library)
  }, [])

  return useMemo(() => ({
    loading,
    error,
    ready: !loading && !error,
    preprocess,
    interpret,
    generateJavaScript,
    generateLlvmIr,
    generateWasm,
    runTests,
  }), [
    loading,
    error,
    preprocess,
    interpret,
    generateJavaScript,
    generateLlvmIr,
    generateWasm,
    runTests,
  ])
}
