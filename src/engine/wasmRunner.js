// Runs a program the Azora compiler built for WebAssembly, in this browser.
//
// The compiler hands back the module (base64) and its host: JavaScript it
// generated to supply the module's imports. Nothing here knows what a
// particular program imports; that is the host's job.

export function decodeModule(base64) {
  const text = atob(base64)
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i)
  return bytes
}

export async function runWasm({ binary, host }) {
  let output = ''
  try {
    const createHost = new Function(`return ${host}`)()
    const runtime = createHost((text) => { output += text })
    const { instance } = await WebAssembly.instantiate(decodeModule(binary), runtime.imports)
    runtime.attach(instance)
    if (typeof instance.exports.main !== 'function') {
      return { success: false, output, errors: "The module exports no 'main' function." }
    }
    await instance.exports.main()
    return { success: true, output, errors: '' }
  } catch (error) {
    // A trap is how a panic or a failed check ends a WebAssembly program.
    const reason = error instanceof WebAssembly.RuntimeError
      ? `WebAssembly trap: ${error.message}`
      : (error?.message || String(error))
    return { success: false, output, errors: reason }
  }
}
