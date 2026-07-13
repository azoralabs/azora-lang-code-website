
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
      return { success: false, output: '', errors: e.message || String(e) }
    }
  }

  const safeJsonAsync = async (fn) => {
    try {
      return JSON.parse(await fn())
    } catch (e) {
      return { success: false, output: '', errors: e.message || String(e) }
    }
  }

  return {
    preprocess(source) {
      return safeJson(() => ns.azPreprocess(source))
    },

    async interpret(source) {
      return safeJsonAsync(() => ns.azInterpret(source))
    },

    generateJavaScript(source) {
      return safeJson(() => ns.azGenerateJavaScript(source))
    },

    generateLlvmIr(source) {
      return safeJson(() => ns.azGenerateLlvmIr(source))
    },

    generateWasm(source) {
      return safeJson(() => ns.azGenerateWasm(source))
    },

    async runTests(source) {
      return safeJsonAsync(() => ns.azRunTests(source))
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
