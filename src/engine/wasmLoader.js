
import { errorMessage } from './errorMessage.js'

export async function loadWasmEngine(version) {
  const basePath = `${import.meta.env.BASE_URL}wasm/${version}`
  const cacheBust = `?t=${Date.now()}`

  const oldScript = document.querySelector('script[data-azora-wasm]')
  if (oldScript) oldScript.remove()

  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.setAttribute('data-azora-wasm', 'true')
    script.src = `${basePath}/azoraLang.js${cacheBust}`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load WASM bundle for version ${version}`))
    document.head.appendChild(script)
  })

  const ns = await waitForExports()

  const safeJson = (fn) => {
    try {
      return JSON.parse(fn())
    } catch (e) {
      return { success: false, output: '', errors: errorMessage(e, 'Compiler request failed') }
    }
  }

  const safeJsonAsync = async (fn) => {
    try {
      return JSON.parse(await fn())
    } catch (e) {
      return { success: false, output: '', errors: errorMessage(e, 'Compiler request failed') }
    }
  }

  const librariesOf = (library) => Array.isArray(library) ? library : [library]
  const encodeLibraries = (library) => librariesOf(library)
    .map(({ path, source }) => `${path.length}:${path}${source.length}:${source}`)
    .join('')
  const withLibraryArgs = (source, library) => [source, library.path, library.source]
  const callWithLibraries = (singleName, multipleName, source, library) => {
    if (!library) return ns[singleName](source)
    if (Array.isArray(library)) return ns[multipleName](source, encodeLibraries(library))
    return ns[`${singleName}WithLibrary`](...withLibraryArgs(source, library))
  }

  return {
    preprocess(source, library = null) {
      return safeJson(() => callWithLibraries('azPreprocess', 'azPreprocessWithLibraries', source, library))
    },

    async interpret(source, library = null) {
      return safeJsonAsync(() => callWithLibraries('azInterpret', 'azInterpretWithLibraries', source, library))
    },

    generateJavaScript(source, library = null) {
      return safeJson(() => callWithLibraries('azGenerateJavaScript', 'azGenerateJavaScriptWithLibraries', source, library))
    },

    generateLlvmIr(source, library = null) {
      return safeJson(() => callWithLibraries('azGenerateLlvmIr', 'azGenerateLlvmIrWithLibraries', source, library))
    },

    generateWasm(source, library = null) {
      return safeJson(() => callWithLibraries('azGenerateWasm', 'azGenerateWasmWithLibraries', source, library))
    },

    async runTests(source, library = null) {
      return safeJsonAsync(() => callWithLibraries('azRunTests', 'azRunTestsWithLibraries', source, library))
    },

    getVersion() {
      try {
        return ns.azGetVersion()
      } catch {
        return version
      }
    },
  }
}

async function waitForExports(maxAttempts = 200) {
  for (let i = 0; i < maxAttempts; i++) {
    const mod = globalThis.compiler
    if (mod) {
      try {
        const resolved = await mod
        if (resolved && typeof resolved.azInterpret === 'function') {
          return resolved
        }
      } catch (_) {}
      if (typeof mod.azInterpret === 'function') {
        return mod
      }
    }
    await new Promise(r => setTimeout(r, 50))
  }
  throw new Error('WASM module did not initialize within timeout')
}
