const WASM_PAGE_BYTES = 64 * 1024
const MIN_REQUEST_MEMORY_BYTES = 4 * 1024 * 1024
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function wasmImports() {
  const ignore = () => {}
  return {
    env: {
      print_i32: ignore,
      print_i64: ignore,
      print_f64: ignore,
      print_f32: ignore,
      print_bool: ignore,
      print_str: ignore,
      write_i32: ignore,
      write_i64: ignore,
      write_f64: ignore,
      write_f32: ignore,
      write_bool: ignore,
      write_str: ignore,
    },
  }
}

function writeString(exports, value) {
  const bytes = textEncoder.encode(value)
  const pointer = exports.azlsReserve(bytes.length)
  new Uint8Array(exports.memory.buffer, pointer + 4, bytes.length).set(bytes)
  return pointer
}

function readString(exports, pointer) {
  const length = new DataView(exports.memory.buffer).getInt32(pointer, true)
  return textDecoder.decode(new Uint8Array(exports.memory.buffer, pointer + 4, length))
}

function growRequestMemory(exports, args) {
  const inputBytes = args.reduce((total, argument) => (
    total + (typeof argument === 'string' ? textEncoder.encode(argument).length + 4 : 0)
  ), 0)
  const desiredBytes = Math.max(
    MIN_REQUEST_MEMORY_BYTES,
    inputBytes * 8 + WASM_PAGE_BYTES,
  )
  const missingBytes = desiredBytes - exports.memory.buffer.byteLength
  if (missingBytes > 0) {
    exports.memory.grow(Math.ceil(missingBytes / WASM_PAGE_BYTES))
  }
}

async function invoke(module, exportName, args) {
  // Azora's current WASM allocator is intentionally monotonic. A fresh,
  // cheaply-instantiated module per request gives every analysis operation a
  // bounded arena while WebAssembly.compile remains cached for this version.
  const instance = await WebAssembly.instantiate(module, wasmImports())
  const exports = instance.exports
  growRequestMemory(exports, args)
  const wasmArgs = args.map((argument) =>
    typeof argument === 'string' ? writeString(exports, argument) : argument,
  )
  const pointer = exports[exportName](...wasmArgs)
  return readString(exports, pointer)
}


let module

self.onmessage = async ({ data: { wasmUrl, exportName, args }, ports: [port] }) => {
  try {
    if (wasmUrl) {
      const response = await fetch(wasmUrl, { cache: 'no-store' })
      if (!response.ok) throw new Error(`AZLS WASM could not be loaded (${response.status})`)
      module = await WebAssembly.compile(await response.arrayBuffer())
      port.postMessage({ result: null })
    } else {
      port.postMessage({ result: await invoke(module, exportName, args) })
    }
  } catch (error) {
    port.postMessage({ error: error.message || String(error) })
  } finally {
    port.close()
  }
}
