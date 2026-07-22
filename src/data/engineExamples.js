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
  {
    title: 'Racing Game',
    code: `module playground

import std.math
import engine.render
import engine.input

func clamp(value: Real, low: Real, high: Real): Real {
    if value < low { return low }
    if value > high { return high }
    return value
}

func abs(value: Real): Real {
    if value < 0.0 { return 0.0 - value }
    return value
}

func blockHeight(gx: Int, gz: Int, second: Bool): Real {
    fin variation = (((gx * 17 + gz * 29) % 7) + 7) % 7
    var height = 7.0 + (variation as Real) * 1.8
    if second { height = height * 0.68 + 2.0 }
    return height
}

func reservedBlock(gx: Int, gz: Int): Bool {
    if gz == -2 { return true }
    if gx == 0 && gz == 0 { return true }
    if gx >= 2 && gx <= 3 && gz == 0 { return true }
    if gx >= 3 && gx <= 5 && gz >= 3 && gz <= 5 { return true }
    if gx >= -5 && gx <= -3 && gz >= 2 && gz <= 4 { return true }
    return false
}

func nearestBlockCoord(value: Real): Int {
    fin scaled = value / 24.0
    if scaled >= 0.0 { return (scaled + 0.5) as Int }
    return (scaled - 0.5) as Int
}

func trafficAngle(time: Real, index: Int): Real {
    fin phase = time * (2.5 + (index as Real) * 0.06) + (index as Real) * 13.0
    return phase * 0.031
}

func trafficX(time: Real, index: Int): Real {
    return std::math::sin(trafficAngle(time, index)) * 82.0
}

func trafficZ(time: Real, index: Int): Real {
    return std::math::cos(trafficAngle(time, index)) * 58.0
}

func pointHitsBox(x: Real, z: Real, centerX: Real, centerZ: Real, halfWidth: Real, halfDepth: Real, radius: Real): Bool {
    return abs(x - centerX) <= halfWidth + radius && abs(z - centerZ) <= halfDepth + radius
}

func hitsStaticWorld(x: Real, z: Real): Bool {
    if abs(x) > 245.0 || abs(z) > 245.0 { return true }

    if abs(z + 48.0) < 8.55 && abs(x) > 14.4 { return true }
    if pointHitsBox(x, z, -15.7, -48.0, 0.16, 9.0, 1.05) { return true }
    if pointHitsBox(x, z, 15.7, -48.0, 0.16, 9.0, 1.05) { return true }

    if pointHitsBox(x, z, 60.0, -1.0, 12.5, 5.25, 1.05) { return true }
    if pointHitsBox(x, z, 96.0, 96.0, 26.0, 7.0, 1.05) { return true }
    if pointHitsBox(x, z, 92.0, 113.0, 17.0, 0.825, 1.05) { return true }
    if pointHitsBox(x, z, -96.0, 76.0, 24.0, 14.5, 1.05) { return true }

    fin gx = nearestBlockCoord(x)
    fin gz = nearestBlockCoord(z)
    if reservedBlock(gx, gz) { return false }
    fin centerX = (gx as Real) * 24.0
    fin centerZ = (gz as Real) * 24.0
    if pointHitsBox(x, z, centerX - 3.55, centerZ, 3.125, 5.9, 1.05) { return true }
    if pointHitsBox(x, z, centerX + 3.55, centerZ, 3.125, 5.9, 1.05) { return true }
    return false
}

func hitsTraffic(x: Real, z: Real, time: Real): Bool {
    var index = 0
    while index < 12 {
        fin dx = x - trafficX(time, index)
        fin dz = z - trafficZ(time, index)
        if dx * dx + dz * dz < 6.25 { return true }
        index = index + 1
    }
    return false
}

func drawStreamedBlock(gx: Int, gz: Int) {
    if reservedBlock(gx, gz) { return }
    fin cx = (gx as Real) * 24.0
    fin cz = (gz as Real) * 24.0
    fin h1 = blockHeight(gx, gz, false)
    fin h2 = blockHeight(gx, gz, true)
    fin variation = (((gx * 11 + gz * 5) % 5) + 5) % 5
    fin shade = 0.31 + (variation as Real) * 0.065

    engine::boxAt(cx, 0.10, cz, 15.5, 0.20, 15.5, 0.0, 0.0, 0.0, 0.49, 0.51, 0.53)
    engine::boxAt(cx - 4.0, 0.025, cz + 0.8, 6.5, 0.03, 12.1, 0.0, 0.0, 0.0, 0.06, 0.065, 0.07)
    engine::boxAt(cx + 3.1, 0.025, cz + 0.8, 6.5, 0.03, 12.1, 0.0, 0.0, 0.0, 0.06, 0.065, 0.07)
    engine::boxAt(cx - 3.55, h1 * 0.5 + 0.20, cz, 6.25, h1, 11.8, 0.0, 0.0, 0.0, shade * 1.08, shade, shade * 0.90)
    engine::boxAt(cx + 3.55, h2 * 0.5 + 0.20, cz, 6.25, h2, 11.8, 0.0, 0.0, 0.0, shade * 0.82, shade * 0.90, shade * 1.07)
    engine::boxAt(cx - 3.55, h1 * 0.62, cz + 5.94, 4.8, 1.1, 0.08, 0.0, 0.0, 0.0, 0.08, 0.28, 0.40)
    engine::boxAt(cx + 3.55, h2 * 0.61, cz + 5.94, 4.8, 0.95, 0.08, 0.0, 0.0, 0.0, 0.08, 0.28, 0.40)
    engine::boxAt(cx - 12.0, 0.035, cz, 0.14, 0.04, 3.8, 0.0, 0.0, 0.0, 0.94, 0.75, 0.18)
    engine::boxAt(cx, 0.035, cz - 12.0, 3.8, 0.04, 0.14, 0.0, 0.0, 0.0, 0.94, 0.75, 0.18)
}

func drawMuseum() {
    engine::boxAt(60.0, 0.10, 0.0, 38.5, 0.20, 16.0, 0.0, 0.0, 0.0, 0.64, 0.62, 0.58)
    engine::boxAt(60.0, 3.7, -1.0, 25.0, 7.0, 10.5, 0.0, 0.0, 0.0, 0.78, 0.75, 0.67)
    engine::boxAt(60.0, 7.45, -1.0, 27.0, 0.55, 12.0, 0.0, 0.0, 0.0, 0.49, 0.47, 0.43)
    var column = -4
    while column <= 4 {
        engine::cylinderAt(60.0 + (column as Real) * 2.4, 3.0, 4.75, 0.30, 5.3, 0.0, 0.0, 0.0, 0.88, 0.86, 0.79)
        column = column + 1
    }
}

func drawStation() {
    engine::boxAt(96.0, 4.8, 96.0, 52.0, 9.2, 14.0, 0.0, 0.0, 0.0, 0.66, 0.60, 0.52)
    engine::boxAt(96.0, 5.0, 88.95, 31.0, 6.2, 0.14, 0.0, 0.0, 0.0, 0.10, 0.34, 0.46)
    engine::boxAt(96.0, 9.75, 96.0, 56.0, 0.65, 17.0, 0.0, 0.0, 0.0, 0.18, 0.21, 0.25)
    var rail = 0
    while rail < 4 {
        engine::boxAt(0.0, 0.16, 112.0 + (rail as Real) * 2.0, 520.0, 0.16, 0.13, 0.0, 0.0, 0.0, 0.16, 0.18, 0.21)
        rail = rail + 1
    }
    var sleeper = -18
    while sleeper <= 18 {
        engine::boxAt((sleeper as Real) * 8.0, 0.10, 115.0, 0.34, 0.12, 9.0, 0.0, 0.0, 0.0, 0.32, 0.22, 0.14)
        sleeper = sleeper + 1
    }
    engine::boxAt(92.0, 1.45, 113.0, 34.0, 2.5, 1.65, 0.0, 0.0, 0.0, 0.78, 0.12, 0.10)
}

func drawMall() {
    engine::boxAt(-96.0, 0.10, 72.0, 64.0, 0.20, 44.0, 0.0, 0.0, 0.0, 0.38, 0.40, 0.42)
    engine::boxAt(-96.0, 5.0, 76.0, 48.0, 9.8, 29.0, 0.0, 0.0, 0.0, 0.72, 0.68, 0.62)
    engine::boxAt(-96.0, 5.2, 61.4, 26.0, 6.4, 0.15, 0.0, 0.0, 0.0, 0.09, 0.31, 0.42)
    engine::boxAt(-96.0, 10.2, 76.0, 51.0, 0.65, 32.0, 0.0, 0.0, 0.0, 0.25, 0.27, 0.30)
    engine::boxAt(-96.0, 7.0, 61.0, 13.0, 1.5, 0.25, 0.0, 0.0, 0.0, 0.82, 0.20, 0.16)
}

func drawRiver(time: Real) {
    var strip = -7
    while strip <= 7 {
        fin wave = std::math::sin(time * 1.8 + (strip as Real) * 0.72) * 0.07
        engine::boxAt(0.0, 0.04 + wave, -48.0 + (strip as Real), 520.0, 0.08, 1.08, 0.0, 0.0, 0.0, 0.08, 0.30, 0.55)
        strip = strip + 1
    }
    engine::boxAt(0.0, 0.12, -48.0, 32.0, 0.24, 17.0, 0.0, 0.0, 0.0, 0.24, 0.26, 0.28)
    engine::boxAt(-15.7, 0.70, -48.0, 0.32, 1.2, 18.0, 0.0, 0.0, 0.0, 0.70, 0.72, 0.74)
    engine::boxAt(15.7, 0.70, -48.0, 0.32, 1.2, 18.0, 0.0, 0.0, 0.0, 0.70, 0.72, 0.74)
}

func carPointX(carX: Real, yaw: Real, x: Real, z: Real): Real {
    return carX + std::math::cos(yaw) * x - std::math::sin(yaw) * z
}

func carPointZ(carZ: Real, yaw: Real, x: Real, z: Real): Real {
    return carZ - std::math::sin(yaw) * x - std::math::cos(yaw) * z
}

func drawWheel(carX: Real, carZ: Real, yaw: Real, spin: Real, steer: Real, x: Real, z: Real) {
    fin wheelX = carPointX(carX, yaw, x, z)
    fin wheelZ = carPointZ(carZ, yaw, x, z)
    engine::wheelAt(wheelX, 0.48, wheelZ, 0.48, 0.34, spin, yaw, steer, 0.025, 0.03, 0.035)
    engine::wheelAt(wheelX, 0.48, wheelZ, 0.25, 0.37, spin, yaw, steer, 0.46, 0.48, 0.51)
}

func drawCar(carX: Real, carZ: Real, yaw: Real, spin: Real, steer: Real) {
    engine::boxAt(carX - 0.28, 0.025, carZ + 0.18, 2.2, 0.03, 4.05, 0.0, yaw, 0.0, 0.05, 0.055, 0.06)
    engine::boxAt(carX, 0.46, carZ, 1.92, 0.56, 3.55, 0.0, yaw, 0.0, 0.92, 0.24, 0.28)
    engine::boxAt(carPointX(carX, yaw, 0.0, -0.28), 0.95, carPointZ(carZ, yaw, 0.0, -0.28), 1.42, 0.78, 1.55, 0.0, yaw, 0.0, 0.08, 0.20, 0.27)
    var leftSteer = steer
    var rightSteer = steer
    if steer > 0.0 {
        leftSteer = steer * 1.16
        rightSteer = steer * 0.88
    }
    if steer < 0.0 {
        leftSteer = steer * 0.88
        rightSteer = steer * 1.16
    }
    drawWheel(carX, carZ, yaw, spin, leftSteer, -1.0, 1.12)
    drawWheel(carX, carZ, yaw, spin, rightSteer, 1.0, 1.12)
    drawWheel(carX, carZ, yaw, spin, 0.0, -1.0, -1.12)
    drawWheel(carX, carZ, yaw, spin, 0.0, 1.0, -1.12)
}

func drawTraffic(time: Real) {
    var index = 0
    while index < 12 {
        fin angle = trafficAngle(time, index)
        fin x = trafficX(time, index)
        fin z = trafficZ(time, index)
        fin yaw = angle - 1.5708
        engine::boxAt(x, 0.45, z, 1.75, 0.62, 3.2, 0.0, yaw, 0.0, 0.22 + (index as Real) * 0.045, 0.42, 0.72)
        index = index + 1
    }
}

func drawWorld(carX: Real, carZ: Real, time: Real) {
    engine::boxAt(0.0, -0.08, 0.0, 520.0, 0.12, 520.0, 0.0, 0.0, 0.0, 0.16, 0.18, 0.20)
    fin centerX = nearestBlockCoord(carX)
    fin centerZ = nearestBlockCoord(carZ)
    var gx = centerX - 4
    while gx <= centerX + 4 {
        var gz = centerZ - 4
        while gz <= centerZ + 4 {
            drawStreamedBlock(gx, gz)
            gz = gz + 1
        }
        gx = gx + 1
    }
    drawRiver(time)
    drawMuseum()
    drawStation()
    drawMall()
    drawTraffic(time)

    engine::cylinderAt(carX + 52.0, 45.0, carZ - 88.0, 5.0, 0.8, 1.5708, 0.0, 0.0, 1.0, 0.73, 0.18)
    var cloud = -2
    while cloud <= 2 {
        fin cloudX = carX + (cloud as Real) * 38.0 + std::math::sin(time * 0.08 + (cloud as Real)) * 15.0
        fin cloudZ = carZ - 54.0 + (cloud as Real) * 20.0
        engine::boxAt(cloudX, 30.0 + (cloud as Real) * 1.5, cloudZ, 16.0, 2.8, 6.0, 0.0, 0.0, 0.0, 0.94, 0.95, 0.97)
        cloud = cloud + 1
    }
}

task main() {
    engine::log("Racing Game: click the viewport, then use WASD, arrows, or touch")
    engine::run3d(960, 540)
    var carX = -9.8
    var carZ = 4.0
    var yaw = 0.0
    var speed = 0.0
    var steer = 0.0
    var wheelSpin = 0.0
    var previousTime = 0.0
    var crashCooldown = 0.0
    loop {
        fin time = await engine::nextFrame()
        var dt = time - previousTime
        previousTime = time
        dt = clamp(dt, 0.0, 0.05)

        var throttle = 0.0
        var steerInput = 0.0
        if engine::input::keyDown(87) || engine::input::keyDown(1003) { throttle = 1.0 }
        if engine::input::keyDown(83) || engine::input::keyDown(1004) { throttle = -1.0 }
        if engine::input::keyDown(65) || engine::input::keyDown(1001) { steerInput = 1.0 }
        if engine::input::keyDown(68) || engine::input::keyDown(1002) { steerInput = -1.0 }
        if engine::input::pointerDown() {
            if engine::input::pointerX() < 320.0 { steerInput = 1.0 }
            if engine::input::pointerX() > 640.0 { steerInput = -1.0 }
            if engine::input::pointerY() < 270.0 { throttle = 1.0 }
            if engine::input::pointerY() >= 270.0 { throttle = -1.0 }
        }

        if throttle > 0.0 { speed = speed + throttle * 20.0 * dt }
        if throttle < 0.0 {
            if speed > 0.0 {
                speed = speed + throttle * 36.0 * dt
            } else {
                speed = speed + throttle * 20.0 * dt
            }
        }
        fin drag = 7.0 * dt
        if speed > drag { speed = speed - drag }
        if speed < 0.0 - drag { speed = speed + drag }
        if speed >= 0.0 - drag && speed <= drag { speed = 0.0 }
        speed = clamp(speed, -8.0, 30.0)
        steer = steer + (steerInput * 0.56 - steer) * clamp(dt * 8.5, 0.0, 1.0)
        yaw = yaw + std::math::tan(steer) * (speed / 2.75) * dt * clamp(abs(speed) / 6.0, 0.0, 1.0)
        fin oldX = carX
        fin oldZ = carZ
        carX = carX - std::math::sin(yaw) * speed * dt
        carZ = carZ - std::math::cos(yaw) * speed * dt
        wheelSpin = wheelSpin + speed * dt / 0.48

        var crashed = false
        fin impactSpeed = abs(speed)
        if hitsStaticWorld(carX, carZ) || hitsTraffic(carX, carZ, time) {
            carX = oldX
            carZ = oldZ
            speed = speed * -0.16
            crashed = true
        }
        if crashCooldown > 0.0 { crashCooldown = crashCooldown - dt }
        if crashed && crashCooldown <= 0.0 {
            engine::crashAudio(clamp(impactSpeed / 12.0, 0.25, 1.0))
            crashCooldown = 0.48
        }
        engine::vehicleAudio(speed, throttle)

        engine::clear(0.53, 0.70, 0.92)
        fin forwardX = 0.0 - std::math::sin(yaw)
        fin forwardZ = 0.0 - std::math::cos(yaw)
        engine::cameraAt(carX - forwardX * 10.0, 5.2, carZ - forwardZ * 10.0, carX + forwardX * 4.0, 0.7, carZ + forwardZ * 4.0, 52.0)
        drawWorld(carX, carZ, time)
        drawCar(carX, carZ, yaw, wheelSpin, steer)
        engine::present()
    }
}`,
  },
]

export const DEFAULT_ENGINE_EXAMPLE = engineExamples[0]
