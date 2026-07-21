export const engineExamples = [
  {
    title: '3D Rotating Cube',
    code: `module playground

import engine.render

task main() {
    engine::log("Starting Azora Engine WASM 3D scene")
    engine::run3d(960, 540)
    loop {
        fin time = await engine::nextFrame()
        engine::clear(0.025, 0.035, 0.055)
        engine::camera(5.2, 46.0)
        engine::cube(1.8, time * 0.55, time * 0.8, time * 0.2, 0.2, 0.72, 1.0)
        engine::present()
    }
}`,
  },
  {
    title: '2D Animation',
    code: `module playground

import engine.render

task main() {
    engine::log("Starting Azora Engine WASM 2D scene")
    engine::run2d(960, 540)
    loop {
        fin time = await engine::nextFrame()
        engine::clear(0.025, 0.035, 0.055)

        fin orbitX = 480.0 + engine::wave(time, 230.0, 1.1)
        fin orbitY = 270.0 + engine::wave(time + 1.5, 105.0, 1.7)

        engine::rect(90.0, 410.0, 780.0, 8.0, 0.18, 0.28, 0.38, 1.0)
        engine::circle(orbitX, orbitY, 44.0, 0.95, 0.32, 0.58, 1.0)
        engine::circle(480.0, 270.0, 17.0, 0.25, 0.78, 0.92, 1.0)
        engine::present()
    }
}`,
  },
]

export const DEFAULT_ENGINE_EXAMPLE = engineExamples[0]
