import { useEffect, useState } from 'react'
import { loadAzoraLanguageServer } from '../engine/azlsLoader.js'

export default function useAzoraLanguageServer(version) {
  const [state, setState] = useState({ loading: true, server: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    setState({ loading: true, server: null, error: null })

    const unavailable = (error) => {
      if (!controller.signal.aborted) {
        setState({ loading: false, server: null, error: error.message || String(error) })
      }
    }
    loadAzoraLanguageServer(version, controller.signal, unavailable).then((server) => {
      if (!controller.signal.aborted) {
        setState({ loading: false, server, error: null })
      }
    }).catch(unavailable)
    return () => controller.abort()
  }, [version])

  return state
}
