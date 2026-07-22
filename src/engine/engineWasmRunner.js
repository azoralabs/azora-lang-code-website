import * as THREE from 'three'
import { BrowserInput } from './browserInput.js'

const TAU = Math.PI * 2
const AUDIO_SAMPLE_RATE = 22050
const AUDIO_SAMPLE_SCALE = 28000 / 32768
const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)
let wabtPromise = null

function loadWabt() {
  if (!wabtPromise) wabtPromise = import('wabt').then(({ default: createWabt }) => createWabt())
  return wabtPromise
}

function colorChannel(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

function clampNumber(value, low, high) {
  return Math.max(low, Math.min(high, Number(value) || 0))
}

function createProceduralBuffer(context, frameCount, sampleAt) {
  const buffer = context.createBuffer(1, frameCount, AUDIO_SAMPLE_RATE)
  const channel = buffer.getChannelData(0)
  for (let frame = 0; frame < frameCount; frame += 1) {
    channel[frame] = clampNumber(sampleAt(frame), -1, 1) * AUDIO_SAMPLE_SCALE
  }
  return buffer
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
    this.drawables3d = []
    this.frame3dCount = 0
    this.material2d = null
    this.drawables2d = []
    this.input = null
    this.audio = null
    this.wheelYawQuaternion = new THREE.Quaternion()
    this.wheelSpinQuaternion = new THREE.Quaternion()
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
        az_cos: Math.cos,
        az_tan: Math.tan,
        az_sqrt: Math.sqrt,
        az_floor: Math.floor,
        az_ceil: Math.ceil,
        az_pow: Math.pow,
        engine__engineWebOpen2d: (width, height, vertex, fragment) => this.open2d(width, height, vertex, fragment),
        engine__engineWebOpen3d: (width, height, vertex, fragment) => this.open3d(width, height, vertex, fragment),
        engine__engineWebNextFrame: new WebAssembly.Suspending(() => this.nextFrame()),
        engine__engineWebPresent: () => this.present(),
        engine__engineWebClear: (...args) => this.clear(...args),
        engine__engineWebRect: (...args) => this.rect(...args),
        engine__engineWebCircle: (...args) => this.circle(...args),
        engine__engineWebBoxAt: (...args) => this.drawBoxAt(...args),
        engine__engineWebCylinderAt: (...args) => this.drawCylinderAt(...args),
        engine__engineWebWheelAt: (...args) => this.drawWheelAt(...args),
        engine__engineWebCamera: (...args) => this.configureCamera(...args),
        engine__engineWebCameraAt: (...args) => this.configureCameraAt(...args),
        engine__engineWebVehicleAudio: (...args) => this.updateVehicleAudio(...args),
        engine__engineWebCrashAudio: (...args) => this.playCrashAudio(...args),
        engine__engineWebLog: emitString,

        engine__input__engineInputKeyDown: (key) => this.input?.keys.has(key) ? 1 : 0,
        engine__input__engineInputKeyPressed: (key) => this.input?.keyPressedFrame.has(key) ? 1 : 0,
        engine__input__engineInputKeyReleased: (key) => this.input?.keyReleasedFrame.has(key) ? 1 : 0,
        engine__input__engineInputAnyKeyDown: () => this.input?.keys.size ? 1 : 0,
        engine__input__engineInputTextCount: () => this.input?.textFrame.length || 0,
        engine__input__engineInputTextCodePoint: (index) => this.input?.textFrame[index] || 0,
        engine__input__engineInputMouseX: () => this.input?.mouseFrame.x || 0,
        engine__input__engineInputMouseY: () => this.input?.mouseFrame.y || 0,
        engine__input__engineInputMouseDeltaX: () => this.input?.mouseFrame.dx || 0,
        engine__input__engineInputMouseDeltaY: () => this.input?.mouseFrame.dy || 0,
        engine__input__engineInputMouseWheelX: () => this.input?.mouseFrame.wheelX || 0,
        engine__input__engineInputMouseWheelY: () => this.input?.mouseFrame.wheelY || 0,
        engine__input__engineInputMouseDown: (button) => this.input?.mouseButtons.has(button) ? 1 : 0,
        engine__input__engineInputMousePressed: (button) => this.input?.mousePressedFrame.has(button) ? 1 : 0,
        engine__input__engineInputMouseReleased: (button) => this.input?.mouseReleasedFrame.has(button) ? 1 : 0,
        engine__input__engineInputMouseInside: () => this.input?.mouseFrame.inside ? 1 : 0,
        engine__input__engineInputPointerLocked: () => document.pointerLockElement === this.canvas ? 1 : 0,
        engine__input__engineInputRequestPointerLock: () => this.input?.requestPointerLock() ? 1 : 0,
        engine__input__engineInputReleasePointerLock: () => this.input?.releasePointerLock(),
        engine__input__engineInputPointerKind: () => this.input?.pointerFrame.kind ?? -1,
        engine__input__engineInputPointerId: () => this.input?.pointerFrame.id ?? -1,
        engine__input__engineInputPointerX: () => this.input?.pointerFrame.x || 0,
        engine__input__engineInputPointerY: () => this.input?.pointerFrame.y || 0,
        engine__input__engineInputPointerDeltaX: () => this.input?.pointerFrame.dx || 0,
        engine__input__engineInputPointerDeltaY: () => this.input?.pointerFrame.dy || 0,
        engine__input__engineInputPointerPressure: () => this.input?.pointerFrame.pressure || 0,
        engine__input__engineInputPointerDown: () => this.input?.pointerFrame.down ? 1 : 0,
        engine__input__engineInputPointerPressed: () => this.input?.pointerPressedFrame ? 1 : 0,
        engine__input__engineInputPointerReleased: () => this.input?.pointerReleasedFrame ? 1 : 0,
        engine__input__engineInputTouchCount: () => this.input?.touchFrame.length || 0,
        engine__input__engineInputTouchId: (index) => this.input?.touch(index)?.id ?? -1,
        engine__input__engineInputTouchX: (index) => this.input?.touch(index)?.x || 0,
        engine__input__engineInputTouchY: (index) => this.input?.touch(index)?.y || 0,
        engine__input__engineInputTouchDeltaX: (index) => this.input?.touch(index)?.dx || 0,
        engine__input__engineInputTouchDeltaY: (index) => this.input?.touch(index)?.dy || 0,
        engine__input__engineInputTouchPressure: (index) => this.input?.touch(index)?.pressure || 0,
        engine__input__engineInputTouchRadiusX: (index) => this.input?.touch(index)?.radiusX || 0,
        engine__input__engineInputTouchRadiusY: (index) => this.input?.touch(index)?.radiusY || 0,
        engine__input__engineInputTouchPhase: (index) => this.input?.touch(index)?.phase || 0,
        engine__input__engineInputControllerCount: () => this.input?.controllers.filter(Boolean).length || 0,
        engine__input__engineInputControllerConnected: (index) => this.input?.controller(index) ? 1 : 0,
        engine__input__engineInputControllerButtonDown: (index, button) => this.input?.controller(index)?.buttons[button]?.down ? 1 : 0,
        engine__input__engineInputControllerButtonPressed: (index, button) => this.input?.controller(index)?.buttons[button]?.pressed ? 1 : 0,
        engine__input__engineInputControllerButtonReleased: (index, button) => this.input?.controller(index)?.buttons[button]?.released ? 1 : 0,
        engine__input__engineInputControllerButtonValue: (index, button) => this.input?.controller(index)?.buttons[button]?.value || 0,
        engine__input__engineInputControllerAxis: (index, axis) => this.input?.controller(index)?.axes[axis] || 0,
        engine__input__engineInputControllerRumble: (...args) => this.input?.rumble(...args) ? 1 : 0,
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
    this.input = new BrowserInput(this.canvas, this.logicalWidth, this.logicalHeight)
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
        this.input?.beginFrame()
        resolve((now - this.startedAt) / 1000)
      })
    })
  }

  present() {
    for (let index = this.frame3dCount; index < this.drawables3d.length; index += 1) {
      this.drawables3d[index].mesh.visible = false
    }
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
    } else if (this.mode === '3d') {
      this.frame3dCount = 0
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

  acquire3d(kind) {
    if (!this.scene || !this.shader3d) return
    const index = this.frame3dCount++
    let entry = this.drawables3d[index]
    if (!entry || entry.kind !== kind) {
      if (entry) {
        this.scene.remove(entry.mesh)
        entry.mesh.geometry.dispose()
        entry.mesh.material.dispose()
      }
      const material = new THREE.RawShaderMaterial({
        vertexShader: this.shader3d.vertex,
        fragmentShader: this.shader3d.fragment,
        glslVersion: THREE.GLSL3,
        uniforms: {
          uColor: { value: new THREE.Vector4(1, 1, 1, 1) },
          uLight: { value: new THREE.Vector4(0.5, 0.8, 0.3, 0.35) },
        },
      })
      let geometry
      if (kind === 'cylinder' || kind === 'wheel') {
        geometry = new THREE.CylinderGeometry(1, 1, 1, kind === 'wheel' ? 20 : 14, 1, false)
        if (kind === 'wheel') geometry.rotateZ(Math.PI / 2)
      } else {
        geometry = new THREE.BoxGeometry(1, 1, 1)
      }
      const mesh = new THREE.Mesh(geometry, material)
      entry = { kind, mesh }
      this.drawables3d[index] = entry
      this.scene.add(mesh)
    }
    entry.mesh.visible = true
    return entry.mesh
  }

  transform3d(mesh, x, y, z, width, height, depth, rotateX, rotateY, rotateZ, r, g, b) {
    if (!mesh) return
    mesh.position.set(Number(x) || 0, Number(y) || 0, Number(z) || 0)
    mesh.scale.set(Math.max(0.001, Number(width) || 1), Math.max(0.001, Number(height) || 1), Math.max(0.001, Number(depth) || 1))
    mesh.rotation.set(Number(rotateX) || 0, Number(rotateY) || 0, Number(rotateZ) || 0)
    mesh.material.uniforms.uColor.value.set(colorChannel(r), colorChannel(g), colorChannel(b), 1)
  }

  drawBoxAt(x, y, z, width, height, depth, rotateX, rotateY, rotateZ, r, g, b) {
    this.transform3d(this.acquire3d('box'), x, y, z, width, height, depth, rotateX, rotateY, rotateZ, r, g, b)
  }

  drawCylinderAt(x, y, z, radius, length, rotateX, rotateY, rotateZ, r, g, b) {
    const diameter = Math.max(0.001, (Number(radius) || 0.5) * 2)
    this.transform3d(this.acquire3d('cylinder'), x, y, z, diameter, length, diameter, rotateX, rotateY, rotateZ, r, g, b)
  }

  drawWheelAt(x, y, z, radius, width, spin, yaw, steer, r, g, b) {
    const mesh = this.acquire3d('wheel')
    if (!mesh) return
    const diameter = Math.max(0.001, (Number(radius) || 0.5) * 2)
    mesh.position.set(Number(x) || 0, Number(y) || 0, Number(z) || 0)
    mesh.scale.set(Math.max(0.001, Number(width) || 0.34), diameter, diameter)
    this.wheelYawQuaternion.setFromAxisAngle(Y_AXIS, (Number(yaw) || 0) + (Number(steer) || 0))
    this.wheelSpinQuaternion.setFromAxisAngle(X_AXIS, Number(spin) || 0)
    mesh.quaternion.copy(this.wheelYawQuaternion).multiply(this.wheelSpinQuaternion)
    mesh.material.uniforms.uColor.value.set(colorChannel(r), colorChannel(g), colorChannel(b), 1)
  }

  configureCamera(distance, fov) {
    if (!(this.camera instanceof THREE.PerspectiveCamera)) return
    this.camera.position.z = Math.max(1.2, Number(distance) || 5.2)
    this.camera.fov = Math.max(20, Math.min(100, Number(fov) || 48))
    this.camera.updateProjectionMatrix()
  }

  configureCameraAt(x, y, z, targetX, targetY, targetZ, fov) {
    if (!(this.camera instanceof THREE.PerspectiveCamera)) return
    this.camera.position.set(Number(x) || 0, Number(y) || 0, Number(z) || 0)
    this.camera.lookAt(Number(targetX) || 0, Number(targetY) || 0, Number(targetZ) || 0)
    this.camera.fov = Math.max(20, Math.min(100, Number(fov) || 48))
    this.camera.updateProjectionMatrix()
  }

  ensureAudio() {
    if (this.audio) return this.audio
    const AudioContextType = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!AudioContextType) return null
    const context = new AudioContextType({ sampleRate: AUDIO_SAMPLE_RATE })
    const master = context.createGain()
    master.gain.value = 1
    master.connect(context.destination)

    const soundtrackBuffer = createProceduralBuffer(context, AUDIO_SAMPLE_RATE * 8, (frame) => {
      const time = frame / AUDIO_SAMPLE_RATE
      const section = Math.floor(time / 2) % 4
      const root = [55, 65.41, 73.42, 49][section]
      const chord = Math.sin(time * TAU * root) * 0.34
        + Math.sin(time * TAU * root * 1.5) * 0.18
        + Math.sin(time * TAU * root * 2) * 0.11
      const beatFrame = frame % Math.floor(AUDIO_SAMPLE_RATE / 2)
      const envelope = beatFrame < 1500 ? 1 - beatFrame / 1500 : 0
      const beat = Math.sin(time * TAU * 44) * envelope * 0.30
      return (chord + beat) * 0.62
    })
    const soundtrackGain = context.createGain()
    soundtrackGain.gain.value = 0.20
    soundtrackGain.connect(master)
    const soundtrack = context.createBufferSource()
    soundtrack.buffer = soundtrackBuffer
    soundtrack.loop = true
    soundtrack.connect(soundtrackGain)
    soundtrack.start()

    const engineBuffer = createProceduralBuffer(context, AUDIO_SAMPLE_RATE, (frame) => {
      const time = frame / AUDIO_SAMPLE_RATE
      return Math.sin(time * TAU * 78) * 0.48
        + Math.sin(time * TAU * 156) * 0.24
        + Math.sin(time * TAU * 312) * 0.10
    })
    const engineGain = context.createGain()
    engineGain.gain.value = 0
    engineGain.connect(master)
    const engine = context.createBufferSource()
    engine.buffer = engineBuffer
    engine.loop = true
    engine.playbackRate.value = 0.72
    engine.connect(engineGain)
    engine.start()

    const crashFrameCount = Math.floor(AUDIO_SAMPLE_RATE * 0.45)
    const crashBuffer = createProceduralBuffer(context, crashFrameCount, (frame) => {
      const time = frame / crashFrameCount
      const noise = ((frame * 97) % 200 - 100) / 100
      const metal = Math.sin(frame * 0.37) * 0.35
      const envelope = (1 - time) * (1 - time)
      return (noise * 0.72 + metal) * envelope
    })

    const resume = () => context.resume().catch(() => {})
    this.canvas?.addEventListener('pointerdown', resume, { once: true })
    resume()
    this.audio = { context, master, soundtrack, soundtrackGain, engine, engineGain, crashBuffer }
    return this.audio
  }

  updateVehicleAudio(speed, throttle) {
    const audio = this.ensureAudio()
    if (!audio) return
    const now = audio.context.currentTime
    const speedRatio = clampNumber(Math.abs(Number(speed) || 0) / 30, 0, 1)
    const load = clampNumber(throttle, 0, 1)
    const volume = clampNumber(0.035 + speedRatio * 0.34 + load * 0.22, 0, 0.58)
    const rate = 0.72 + speedRatio * 1.20 + load * 0.16
    audio.engine.playbackRate.setTargetAtTime(rate, now, 0.035)
    audio.engineGain.gain.setTargetAtTime(volume, now, 0.04)
  }

  playCrashAudio(intensity) {
    const audio = this.ensureAudio()
    if (!audio) return
    const gain = audio.context.createGain()
    gain.gain.value = clampNumber(intensity, 0.18, 1)
    const source = audio.context.createBufferSource()
    source.buffer = audio.crashBuffer
    source.connect(gain).connect(audio.master)
    source.start()
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
    this.input?.dispose()
    this.input = null
    for (const { mesh } of this.drawables3d) {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    this.drawables3d = []
    this.frame3dCount = 0
    this.audio?.context.close().catch(() => {})
    this.audio = null
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
