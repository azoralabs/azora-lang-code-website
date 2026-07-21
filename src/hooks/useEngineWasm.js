import { useEffect, useState } from 'react'
import { loadEngineWasmAssets } from '../engine/engineWasmLoader.js'

export default function useEngineWasm(version) {
  const [state, setState] = useState({ loading: true, assets: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, assets: null, error: null })
    loadEngineWasmAssets(version).then((assets) => {
      if (!cancelled) setState({ loading: false, assets, error: null })
    }).catch((error) => {
      if (!cancelled) setState({ loading: false, assets: null, error: error.message || String(error) })
    })
    return () => { cancelled = true }
  }, [version])

  return state
}
