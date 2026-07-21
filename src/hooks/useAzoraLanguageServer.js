import { useEffect, useRef, useState } from 'react'
import { loadAzoraLanguageServer } from '../engine/azlsLoader.js'

export default function useAzoraLanguageServer(version) {
  const [state, setState] = useState({ loading: true, server: null, error: null })
  const generation = useRef(0)

  useEffect(() => {
    const currentGeneration = ++generation.current
    setState({ loading: true, server: null, error: null })

    loadAzoraLanguageServer(version).then((server) => {
      if (generation.current === currentGeneration) {
        setState({ loading: false, server, error: null })
      }
    }).catch((error) => {
      if (generation.current === currentGeneration) {
        setState({ loading: false, server: null, error: error.message || String(error) })
      }
    })
  }, [version])

  return state
}
