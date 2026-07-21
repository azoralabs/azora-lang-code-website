import * as THREE from 'three'

const TAU = Math.PI * 2
let wabtPromise = null

function loadWabt() {
  if (!wabtPromise) wabtPromise = import('wabt').then(({ default: createWabt }) => createWabt())
  return wabtPromise
}

function colorChannel(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

function shaderBody(source) {
  return source.replace(/^#version\s+300\s+es\s*/, '')
}

class EngineWasmSession {
  constructor(container, onMessage) {
    this.container = container
    this.onMessage = onMessage
    this.instance = null
    this.memory = null
    this.mainPromise = null
    this.mode = null
    this.logicalWidth = 960
    this.logicalHeight = 540
    this.canvas = null
    this.renderer = null
    this.scene = null
    this.camera = null
    this.cube = null
    this.cubeSize = 0
    this.material2d = null
    this.drawables2d = []
    this.resizeObserver = null
    this.startedAt = 0
    this.pendingFrame = 0
    this.pendingFrameReject = null
    this.disposed = false
    this.surfaceReady = new Promise((resolve) => { this.resolveSurfaceReady = resolve })
  }

  decodeString(pointer) {
    if (!this.memory || !pointer) return ''
    const view = new DataView(this.memory.buffer)
    const length = view.getUint32(pointer, true)
    return new TextDecoder().decode(new Uint8Array(this.memory.buffer, pointer + 4, length))
  }

  createImports() {
    if (typeof WebAssembly.Suspending !== 'function') {
      throw new Error('This browser does not support WebAssembly JSPI, required by Azora task-based engine loops.')
    }

    const emit = (value) => this.onMessage(String(value), 'output')
    const emitString = (pointer) => emit(this.decodeString(pointer))
    return {
      env: {
        print_i32: emit,
        print_i64: emit,
        print_f64: emit,
        print_f32: emit,
        print_bool: (value) => emit(value ? 'true' : 'false'),
        print_str: emitString,
        write_i32: emit,
        write_i64: emit,
        write_f64: emit,
        write_f32: emit,
        write_bool: (value) => emit(value ? 'true' : 'false'),
        write_str: emitString,
        az_sin: Math.sin,
        engine__engineWebOpen2d: (width, height, vertex, fragment) => this.open2d(width, height, vertex, fragment),
        engine__engineWebOpen3d: (width, height, vertex, fragment) => this.open3d(width, height, vertex, fragment),
        engine__engineWebNextFrame: new WebAssembly.Suspending(() => this.nextFrame()),
        engine__engineWebPresent: () => this.present(),
        engine__engineWebClear: (...args) => this.clear(...args),
        engine__engineWebRect: (...args) => this.rect(...args),
        engine__engineWebCircle: (...args) => this.circle(...args),
        engine__engineWebCube: (...args) => this.drawCube(...args),
        engine__engineWebCamera: (...args) => this.configureCamera(...args),
        engine__engineWebLog: emitString,
      },
    }
  }

  attach(instance) {
    this.instance = instance
    this.memory = instance.exports.memory
  }

  resetSurface(mode, width, height) {
    this.disposeSurface()
    this.mode = mode
    this.logicalWidth = Math.max(1, Number(width) || 960)
    this.logicalHeight = Math.max(1, Number(height) || 540)
    this.container.replaceChildren()
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'engine-wasm-canvas'
    this.canvas.dataset.engineMode = mode
    this.canvas.setAttribute('aria-label', mode === '3d' ? 'Azora Engine 3D viewport' : 'Azora Engine 2D viewport')
    this.container.appendChild(this.canvas)
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene = new THREE.Scene()
    this.resizeRenderer()
    this.resizeObserver = new ResizeObserver(() => this.resizeRenderer())
    this.resizeObserver.observe(this.container)
  }

  open2d(width, height, vertexPointer, fragmentPointer) {
    this.resetSurface('2d', width, height)
    this.camera = new THREE.Camera()
    this.material2d = new THREE.RawShaderMaterial({
      vertexShader: shaderBody(this.decodeString(vertexPointer)),
      fragmentShader: shaderBody(this.decodeString(fragmentPointer)),
      glslVersion: THREE.GLSL3,
      uniforms: {
        uViewport: { value: new THREE.Vector2(this.logicalWidth, this.logicalHeight) },
        uUseTexture: { value: false },
        uTexture: { value: null },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.resolveSurfaceReady()
  }

  open3d(width, height, vertexPointer, fragmentPointer) {
    this.resetSurface('3d', width, height)
    this.camera = new THREE.PerspectiveCamera(48, this.logicalWidth / this.logicalHeight, 0.1, 100)
    this.camera.position.set(0, 0.35, 5.2)
    this.camera.lookAt(0, 0, 0)
    this.shader3d = {
      vertex: shaderBody(this.decodeString(vertexPointer)),
      fragment: shaderBody(this.decodeString(fragmentPointer)),
    }
    this.resolveSurfaceReady()
  }

  nextFrame() {
    if (this.disposed) return Promise.reject(new Error('Engine session was cancelled'))
    return new Promise((resolve, reject) => {
      this.pendingFrameReject = reject
      this.pendingFrame = requestAnimationFrame((now) => {
        this.pendingFrame = 0
        this.pendingFrameReject = null
        if (!this.startedAt) this.startedAt = now
        resolve((now - this.startedAt) / 1000)
      })
    })
  }

  present() {
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera)
  }

  clear(r, g, b) {
    if (!this.renderer) return
    this.renderer.setClearColor(new THREE.Color(colorChannel(r), colorChannel(g), colorChannel(b)), 1)
    if (this.mode === '2d') {
      for (const mesh of this.drawables2d) {
        this.scene.remove(mesh)
        mesh.geometry.dispose()
      }
      this.drawables2d = []
    }
  }

  add2dMesh(positions, colors, uvs) {
    if (!this.scene || !this.material2d) return
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
    const mesh = new THREE.Mesh(geometry, this.material2d)
    mesh.frustumCulled = false
    this.scene.add(mesh)
    this.drawables2d.push(mesh)
  }

  rect(x, y, width, height, r, g, b, a) {
    const x2 = x + width
    const y2 = y + height
    const positions = [x, y, 0, x2, y, 0, x2, y2, 0, x, y, 0, x2, y2, 0, x, y2, 0]
    const uvs = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]
    const color = [colorChannel(r), colorChannel(g), colorChannel(b), colorChannel(a)]
    this.add2dMesh(positions, Array(6).fill(color).flat(), uvs)
  }

  circle(x, y, radius, r, g, b, a) {
    const segments = 48
    const positions = []
    const colors = []
    const uvs = []
    const color = [colorChannel(r), colorChannel(g), colorChannel(b), colorChannel(a)]
    for (let index = 0; index < segments; index += 1) {
      const a0 = index / segments * TAU
      const a1 = (index + 1) / segments * TAU
      positions.push(x, y, 0, x + Math.cos(a0) * radius, y + Math.sin(a0) * radius, 0, x + Math.cos(a1) * radius, y + Math.sin(a1) * radius, 0)
      uvs.push(0.5, 0.5, (Math.cos(a0) + 1) / 2, (Math.sin(a0) + 1) / 2, (Math.cos(a1) + 1) / 2, (Math.sin(a1) + 1) / 2)
      colors.push(...color, ...color, ...color)
    }
    this.add2dMesh(positions, colors, uvs)
  }

  drawCube(size, rotateX, rotateY, rotateZ, r, g, b) {
    if (!this.scene || !this.shader3d) return
    const normalizedSize = Math.max(0.05, Number(size) || 1)
    if (!this.cube || this.cubeSize !== normalizedSize) {
      if (this.cube) {
        this.scene.remove(this.cube)
        this.cube.geometry.dispose()
        this.cube.material.dispose()
      }
      const material = new THREE.RawShaderMaterial({
        vertexShader: this.shader3d.vertex,
        fragmentShader: this.shader3d.fragment,
        glslVersion: THREE.GLSL3,
        uniforms: {
          uColor: { value: new THREE.Vector4(colorChannel(r), colorChannel(g), colorChannel(b), 1) },
          uLight: { value: new THREE.Vector4(0.5, 0.8, 0.3, 0.35) },
        },
      })
      this.cube = new THREE.Mesh(new THREE.BoxGeometry(normalizedSize, normalizedSize, normalizedSize), material)
      this.cubeSize = normalizedSize
      this.scene.add(this.cube)
    }
    this.cube.material.uniforms.uColor.value.set(colorChannel(r), colorChannel(g), colorChannel(b), 1)
    this.cube.rotation.set(rotateX, rotateY, rotateZ)
  }

  configureCamera(distance, fov) {
    if (!(this.camera instanceof THREE.PerspectiveCamera)) return
    this.camera.position.z = Math.max(1.2, Number(distance) || 5.2)
    this.camera.fov = Math.max(20, Math.min(100, Number(fov) || 48))
    this.camera.updateProjectionMatrix()
  }

  resizeRenderer() {
    if (!this.renderer) return
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(width, height, false)
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }
  }

  startMain() {
    if (typeof WebAssembly.promising !== 'function') {
      throw new Error('This browser does not support WebAssembly JSPI promising exports.')
    }
    const main = WebAssembly.promising(this.instance.exports.main)
    this.mainPromise = main().catch((error) => {
      if (!this.disposed) this.onMessage(`Engine task failed: ${error.message || String(error)}`, 'error')
    })
  }

  disposeSurface() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    for (const mesh of this.drawables2d) mesh.geometry.dispose()
    this.drawables2d = []
    this.material2d?.dispose()
    this.material2d = null
    if (this.cube) {
      this.cube.geometry.dispose()
      this.cube.material.dispose()
    }
    this.cube = null
    this.renderer?.dispose()
    this.renderer = null
    this.scene = null
    this.camera = null
  }

  dispose() {
    this.disposed = true
    if (this.pendingFrame) cancelAnimationFrame(this.pendingFrame)
    this.pendingFrame = 0
    this.pendingFrameReject?.(new Error('Engine session was cancelled'))
    this.pendingFrameReject = null
    this.disposeSurface()
    this.container.replaceChildren()
    this.instance = null
    this.memory = null
  }
}

async function compileWat(wat) {
  const wabt = await loadWabt()
  const module = wabt.parseWat('playground.az.wat', wat)
  try {
    module.resolveNames()
    module.validate()
    return module.toBinary({ log: false, canonicalize_lebs: true }).buffer
  } finally {
    module.destroy()
  }
}

export async function runEngineWasm({ wat, container, onMessage }) {
  const session = new EngineWasmSession(container, onMessage)
  try {
    const binary = await compileWat(wat)
    const { instance } = await WebAssembly.instantiate(binary, session.createImports())
    session.attach(instance)
    if (typeof instance.exports.main !== 'function') throw new Error("Engine programs must export 'task main()'")
    session.startMain()
    await Promise.race([
      session.surfaceReady,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Engine main did not open a rendering surface.')), 5000)),
    ])
    return { result: { success: true, output: '', errors: '' }, session }
  } catch (error) {
    session.dispose()
    return {
      result: { success: false, output: '', errors: error.message || String(error) },
      session: null,
    }
  }
}
