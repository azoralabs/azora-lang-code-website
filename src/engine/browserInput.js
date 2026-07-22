const KEY_CODES = Object.freeze({
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  Escape: 27,
  Space: 32,
  ArrowLeft: 1001,
  ArrowRight: 1002,
  ArrowUp: 1003,
  ArrowDown: 1004,
  ShiftLeft: 1005,
  ShiftRight: 1005,
  ControlLeft: 1006,
  ControlRight: 1006,
  AltLeft: 1007,
  AltRight: 1007,
  MetaLeft: 1008,
  MetaRight: 1008,
  CapsLock: 1009,
  Insert: 1010,
  Delete: 1011,
  Home: 1012,
  End: 1013,
  PageUp: 1014,
  PageDown: 1015,
  F1: 1021,
  F2: 1022,
  F3: 1023,
  F4: 1024,
  F5: 1025,
  F6: 1026,
  F7: 1027,
  F8: 1028,
  F9: 1029,
  F10: 1030,
  F11: 1031,
  F12: 1032,
})

const POINTER_KIND = Object.freeze({ mouse: 0, touch: 1, pen: 2 })
const TOUCH = Object.freeze({ NONE: 0, BEGAN: 1, MOVED: 2, STATIONARY: 3, ENDED: 4, CANCELLED: 5 })

function azoraKeyCode(event) {
  if (event.code.startsWith('Key') && event.code.length === 4) return event.code.charCodeAt(3)
  if (event.code.startsWith('Digit') && event.code.length === 6) return event.code.charCodeAt(5)
  if (event.code.startsWith('Numpad') && event.code.length === 7) return event.code.charCodeAt(6)
  return KEY_CODES[event.code] ?? 0
}

function mouseButton(button) {
  if (button === 2) return 1
  if (button === 1) return 2
  return button
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0))
}

export class BrowserInput {
  constructor(canvas, logicalWidth, logicalHeight) {
    this.canvas = canvas
    this.logicalWidth = logicalWidth
    this.logicalHeight = logicalHeight
    this.listeners = []
    this.keys = new Set()
    this.pendingKeyPressed = new Set()
    this.pendingKeyReleased = new Set()
    this.keyPressedFrame = new Set()
    this.keyReleasedFrame = new Set()
    this.pendingText = []
    this.textFrame = []
    this.mouseButtons = new Set()
    this.pendingMousePressed = new Set()
    this.pendingMouseReleased = new Set()
    this.mousePressedFrame = new Set()
    this.mouseReleasedFrame = new Set()
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, wheelX: 0, wheelY: 0, inside: false }
    this.mouseFrame = { ...this.mouse }
    this.pointers = new Map()
    this.endedTouches = []
    this.touchFrame = []
    this.activePointerId = -1
    this.lastPointer = null
    this.pendingPointerPressed = false
    this.pendingPointerReleased = false
    this.pointerPressedFrame = false
    this.pointerReleasedFrame = false
    this.pointerDx = 0
    this.pointerDy = 0
    this.pointerFrame = { kind: -1, id: -1, x: 0, y: 0, dx: 0, dy: 0, pressure: 0, down: false }
    this.controllers = []
    this.previousControllerButtons = new Map()
    this.install()
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options)
    this.listeners.push(() => target.removeEventListener(type, handler, options))
  }

  install() {
    this.canvas.tabIndex = 0
    this.canvas.style.touchAction = 'none'

    this.listen(globalThis, 'keydown', (event) => {
      if (document.activeElement !== this.canvas && document.pointerLockElement !== this.canvas) return
      const code = azoraKeyCode(event)
      if (!code) return
      if (!this.keys.has(code)) this.pendingKeyPressed.add(code)
      this.keys.add(code)
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        for (const character of event.key) this.pendingText.push(character.codePointAt(0))
      }
      event.preventDefault()
    })
    this.listen(globalThis, 'keyup', (event) => {
      if (document.activeElement !== this.canvas && document.pointerLockElement !== this.canvas) return
      const code = azoraKeyCode(event)
      if (!code) return
      if (this.keys.delete(code)) this.pendingKeyReleased.add(code)
      event.preventDefault()
    })
    this.listen(globalThis, 'blur', () => {
      for (const code of this.keys) this.pendingKeyReleased.add(code)
      for (const button of this.mouseButtons) this.pendingMouseReleased.add(button)
      this.keys.clear()
      this.mouseButtons.clear()
      this.pointers.clear()
      this.activePointerId = -1
    })

    this.listen(this.canvas, 'contextmenu', (event) => event.preventDefault())
    this.listen(this.canvas, 'pointerenter', () => { this.mouse.inside = true })
    this.listen(this.canvas, 'pointerleave', (event) => {
      if (event.pointerType === 'mouse') this.mouse.inside = false
    })
    this.listen(this.canvas, 'pointerdown', (event) => this.onPointerDown(event))
    this.listen(this.canvas, 'pointermove', (event) => this.onPointerMove(event))
    this.listen(this.canvas, 'pointerup', (event) => this.onPointerEnd(event, false))
    this.listen(this.canvas, 'pointercancel', (event) => this.onPointerEnd(event, true))
    this.listen(this.canvas, 'wheel', (event) => {
      this.mouse.wheelX += event.deltaX
      this.mouse.wheelY += event.deltaY
      event.preventDefault()
    }, { passive: false })
  }

  coordinates(event) {
    const bounds = this.canvas.getBoundingClientRect()
    return {
      x: (event.clientX - bounds.left) / Math.max(1, bounds.width) * this.logicalWidth,
      y: (event.clientY - bounds.top) / Math.max(1, bounds.height) * this.logicalHeight,
      scaleX: this.logicalWidth / Math.max(1, bounds.width),
      scaleY: this.logicalHeight / Math.max(1, bounds.height),
    }
  }

  pointerState(event, previous = null) {
    const point = this.coordinates(event)
    const x = document.pointerLockElement === this.canvas && previous
      ? previous.x + event.movementX * point.scaleX
      : point.x
    const y = document.pointerLockElement === this.canvas && previous
      ? previous.y + event.movementY * point.scaleY
      : point.y
    return {
      id: event.pointerId,
      kind: POINTER_KIND[event.pointerType] ?? POINTER_KIND.mouse,
      type: event.pointerType,
      x,
      y,
      pressure: event.pressure || (event.buttons ? 0.5 : 0),
      radiusX: (event.width || 1) * point.scaleX / 2,
      radiusY: (event.height || 1) * point.scaleY / 2,
      dx: 0,
      dy: 0,
      down: event.buttons !== 0 || event.pointerType === 'touch',
      phase: TOUCH.STATIONARY,
    }
  }

  onPointerDown(event) {
    this.canvas.focus({ preventScroll: true })
    this.canvas.setPointerCapture?.(event.pointerId)
    const state = this.pointerState(event)
    state.down = true
    state.phase = TOUCH.BEGAN
    this.pointers.set(event.pointerId, state)
    this.activePointerId = event.pointerId
    this.lastPointer = state
    this.pendingPointerPressed = true
    if (event.pointerType === 'mouse') {
      const button = mouseButton(event.button)
      if (!this.mouseButtons.has(button)) this.pendingMousePressed.add(button)
      this.mouseButtons.add(button)
      this.mouse.x = state.x
      this.mouse.y = state.y
      this.mouse.inside = true
    }
    event.preventDefault()
  }

  onPointerMove(event) {
    const previous = this.pointers.get(event.pointerId) || this.lastPointer
    const state = this.pointerState(event, previous)
    if (previous) {
      const point = this.coordinates(event)
      const eventDx = document.pointerLockElement === this.canvas
        ? event.movementX * point.scaleX
        : state.x - previous.x
      const eventDy = document.pointerLockElement === this.canvas
        ? event.movementY * point.scaleY
        : state.y - previous.y
      state.dx = (previous.dx || 0) + eventDx
      state.dy = (previous.dy || 0) + eventDy
      this.pointerDx += eventDx
      this.pointerDy += eventDy
      if (event.pointerType === 'mouse') {
        this.mouse.dx += eventDx
        this.mouse.dy += eventDy
      }
    }
    state.phase = state.dx || state.dy ? TOUCH.MOVED : TOUCH.STATIONARY
    state.down = previous?.down || event.buttons !== 0 || event.pointerType === 'touch'
    this.pointers.set(event.pointerId, state)
    if (this.activePointerId === event.pointerId || this.activePointerId < 0) {
      this.lastPointer = state
    }
    if (event.pointerType === 'mouse') {
      this.mouse.x = state.x
      this.mouse.y = state.y
    }
    if (state.down) event.preventDefault()
  }

  onPointerEnd(event, cancelled) {
    const previous = this.pointers.get(event.pointerId) || this.pointerState(event)
    const state = this.pointerState(event, previous)
    state.down = false
    state.phase = cancelled ? TOUCH.CANCELLED : TOUCH.ENDED
    this.lastPointer = state
    this.pendingPointerReleased = true
    if (event.pointerType === 'touch') this.endedTouches.push(state)
    this.pointers.delete(event.pointerId)
    if (this.activePointerId === event.pointerId) {
      const replacement = [...this.pointers.values()].find((pointer) => pointer.down)
      this.activePointerId = replacement?.id ?? -1
    }
    if (event.pointerType === 'mouse') {
      const button = mouseButton(event.button)
      if (this.mouseButtons.delete(button)) this.pendingMouseReleased.add(button)
      this.mouse.x = state.x
      this.mouse.y = state.y
    }
    event.preventDefault()
  }

  beginFrame() {
    this.keyPressedFrame = new Set(this.pendingKeyPressed)
    this.keyReleasedFrame = new Set(this.pendingKeyReleased)
    this.pendingKeyPressed.clear()
    this.pendingKeyReleased.clear()
    this.textFrame = this.pendingText.splice(0)

    this.mousePressedFrame = new Set(this.pendingMousePressed)
    this.mouseReleasedFrame = new Set(this.pendingMouseReleased)
    this.pendingMousePressed.clear()
    this.pendingMouseReleased.clear()
    this.mouseFrame = { ...this.mouse }
    this.mouse.dx = 0
    this.mouse.dy = 0
    this.mouse.wheelX = 0
    this.mouse.wheelY = 0

    this.pointerPressedFrame = this.pendingPointerPressed
    this.pointerReleasedFrame = this.pendingPointerReleased
    this.pendingPointerPressed = false
    this.pendingPointerReleased = false
    const active = this.pointers.get(this.activePointerId) || this.lastPointer
    this.pointerFrame = active
      ? { ...active, dx: this.pointerDx, dy: this.pointerDy, down: this.pointers.has(active.id) && active.down }
      : { kind: -1, id: -1, x: 0, y: 0, dx: 0, dy: 0, pressure: 0, down: false }
    this.pointerDx = 0
    this.pointerDy = 0

    const activeTouches = [...this.pointers.values()]
      .filter((pointer) => pointer.type === 'touch')
      .sort((left, right) => left.id - right.id)
      .map((pointer) => ({ ...pointer, phase: pointer.phase === TOUCH.BEGAN ? TOUCH.BEGAN : (pointer.dx || pointer.dy ? TOUCH.MOVED : TOUCH.STATIONARY) }))
    this.touchFrame = [...activeTouches, ...this.endedTouches]
    this.endedTouches = []
    for (const pointer of this.pointers.values()) {
      pointer.dx = 0
      pointer.dy = 0
      if (pointer.phase === TOUCH.BEGAN || pointer.phase === TOUCH.MOVED) pointer.phase = TOUCH.STATIONARY
    }

    this.pollControllers()
  }

  pollControllers() {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []
    this.controllers = Array.from(pads || []).map((pad, index) => {
      if (!pad) return null
      const previous = this.previousControllerButtons.get(index) || []
      const buttons = pad.buttons.map((button, buttonIndex) => ({
        down: button.pressed || button.value > 0.5,
        pressed: !(previous[buttonIndex] > 0.5) && button.value > 0.5,
        released: previous[buttonIndex] > 0.5 && button.value <= 0.5,
        value: button.value,
      }))
      this.previousControllerButtons.set(index, pad.buttons.map((button) => button.value))
      return { pad, buttons, axes: [...pad.axes] }
    })
  }

  touch(index) {
    return this.touchFrame[index] || null
  }

  controller(index) {
    return this.controllers[index] || null
  }

  rumble(index, low, high, durationMs) {
    const controller = this.controller(index)
    const actuator = controller?.pad?.vibrationActuator
    if (!actuator?.playEffect) return false
    actuator.playEffect('dual-rumble', {
      duration: Math.max(0, durationMs),
      weakMagnitude: clamp(low, 0, 1),
      strongMagnitude: clamp(high, 0, 1),
    }).catch(() => {})
    return true
  }

  requestPointerLock() {
    if (!this.canvas.requestPointerLock) return false
    this.canvas.requestPointerLock()
    return true
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.()
  }

  dispose() {
    this.releasePointerLock()
    for (const remove of this.listeners.splice(0)) remove()
    this.keys.clear()
    this.mouseButtons.clear()
    this.pointers.clear()
  }
}
