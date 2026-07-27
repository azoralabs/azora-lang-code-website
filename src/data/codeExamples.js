// Example snippets shown in the playground's Example selector.
// Every example compiles and runs on all playground code-generation targets.
export const codeExamples = [
  {
    title: 'Hello World',
    code: `module playground

import std.io

func main() {
    std::println("Hello, world!")
}`,
  },
  {
    title: 'Variables',
    code: `module playground

import std.io

func main() {
    var count = 0
    count = count + 1
    count += 5

    fin name = "Azora"
    let greeting = "Hello, \${name}!"

    std::println(greeting)
    std::println("count is \${count}")
}`,
  },
  {
    title: 'Functions',
    code: `module playground

import std.io

func add(a: Int, b: Int): Int {
    return a + b
}

func factorial(n: Int): Int {
    if n <= 1 { return 1 }
    return n * factorial(n - 1)
}

func main() {
    std::println("\${add(3, 4)}")
    std::println("\${factorial(5)}")
}`,
  },
  {
    title: 'Control Flow',
    code: `module playground

import std.io

func main() {
    var sum = 0
    for i in 1..10 {
        sum += i
    }
    std::println("sum 1..10 = \${sum}")

    var i = 0
    loop {
        i += 1
        if i == 7 { break }
    }
    std::println("stopped at \${i}")

    var evens = 0
    for n in 0..<10 {
        if n % 2 != 0 { continue }
        evens += 1
    }
    std::println("even count = \${evens}")
}`,
  },
  {
    title: 'Lists',
    code: `module playground

import std.io
import std.container.list

func main() {
    var nums = std::mutableListOf<Int>()
    nums.add(10)
    nums.add(20)
    nums.add(30)
    std::println(nums[0])
    std::println(nums.size)

    nums.add(40)
    nums.set(0, 99)
    std::println(nums.size)
    std::println(nums[0])

    var total = 0
    for i in 0..<nums.size {
        total += nums[i]
    }
    std::println("total = \${total}")
}`,
  },
  {
    title: 'Strings',
    code: `module playground

import std.io

func main() {
    var name = "Azora"
    var n = 3

    std::println("Hello, \$name!")
    std::println("\${n} x \${n} = \${n * n}")
    std::println("ab" * 3)
    std::println("length is \${name.length}")
}`,
  },
  {
    title: 'Structs (pack)',
    code: `module playground

import std.io
import std.container.list

pack Point {
    var x: Int
    var y: Int
}

func main() {
    var p = Point(3, 4)
    std::println("\${p.x}, \${p.y}")

    p.x = 10
    p.y += 1
    std::println("\${p.x}, \${p.y}")

    var points = std::listOf(Point(1, 1), Point(2, 2), Point(3, 3))
    var last: Point = points[2]
    std::println("last = \${last.x}, \${last.y}")
}`,
  },
  {
    title: 'Operators & Ranges',
    code: `module playground

import std.io

func main() {
    var n = 10
    n += 5
    n *= 2
    std::println(n)

    std::println(17 / 5)
    std::println(17 % 5)

    var sum = 0
    for i in 1..<5 {
        sum += i
    }
    std::println("sum 1..<5 = \${sum}")
}`,
  },
  {
    title: 'Scopes',
    code: `module playground

import std.io

func main() {
    var x = 1
    zone {
        var x = 2
        std::println("inner \${x}")
        std::println("outer \${::x}")
    }
    std::println("after \${x}")
}`,
  },
  {
    title: 'Compile-Time Execution',
    code: `module playground

import std.io

inline func square(x: Int): Int {
    return x * x
}

func main() {
    inline fin SIZE = 8
    trace "size: \${SIZE}"
    trace "squared: \${square(5)}"
}`,
  },
  {
    title: 'Testing',
    code: `module playground

import std.io

func factorial(n: Int): Int {
    if n <= 1 { return 1 }
    return n * factorial(n - 1)
}

test "factorial of 5 is 120" {
    assert factorial(5) == 120 { "5! should be 120" }
}

test "factorial of 0 is 1" {
    assert factorial(0) == 1 { "0! should be 1" }
}

func main() {
    std::println("running tests...")
}`,
  },
  {
    title: 'Enums & When',
    code: `module playground

import std.io

enum Light {
    Red
    Yellow
    Green
}

func action(l: Light): String {
    when l {
        Light.Red -> { return "stop" }
        Light.Yellow -> { return "slow" }
        Light.Green -> { return "go" }
        else -> { return "unknown" }
    }
}

func main() {
    std::println(action(Light.Green))
    std::println(action(Light.Red))
}`,
  },
  {
    title: 'Tuples',
    code: `module playground

import std.io
import std.container.tuple

func divmod(a: Int, b: Int): std::Tuple<Int, Int> {
    return std::tupleOf(a / b, a % b)
}

func main() {
    fin r = divmod(17, 5)
    std::println("quotient: \${r.0}")
    std::println("remainder: \${r.1}")

    fin pair = std::tupleOf(1, "hello")
    std::println(pair.0)
    std::println(pair.1)
}`,
  },
  {
    title: 'Error Handling',
    code: `module playground

import std.io

func safeDiv(a: Int, b: Int): Int {
    if b == 0 { throw "division by zero" }
    return a / b
}

func main() {
    std::println(safeDiv(10, 2) catch -1)
    std::println(safeDiv(10, 0) catch -1)

    try {
        throw "boom"
    } catch { e ->
        std::println("caught: " + e)
    }
}`,
  },
  {
    title: 'Impl Methods',
    code: `module playground

import std.io

pack Point {
    var x: Int
    var y: Int
}

impl Point {
    func lengthSquared(): Int { self& ->
        return self.x * self.x + self.y * self.y
    }
    func moveBy(dx: Int, dy: Int) { self! ->
        self.x = self.x + dx
        self.y = self.y + dy
    }
}

func main() {
    var p = Point(3, 4)
    std::println(p.lengthSquared())
    p.moveBy(10, 20)
    std::println(p.lengthSquared())
}`,
  },

  {
    title: 'Extension Methods',
    code: `module playground

import std.io

pack Counter {
    var value: Int
}

impl Counter {
    func bump() { self! ->
        self.value = self.value + 1
    }
}

func peek()[self: Counter&]: Int {
    return self.value
}

func main() {
    var c = Counter(40)
    c.bump()
    std::println("value=\${c.peek()}")
}`,
  },
  {
    title: 'Reactive mem',
    code: `module playground

import std.io

@Reactive
func searchSession() {
    // mem is transient state owned by this reactive instance.
    // It survives reactive re-execution, but not owner recreation.
    mem query: String = ""
    mem resultCount: Int = 0

    // No dependency list: dependencies are inferred from values read here.
    effect {
        trace .Debug { "Rendering \${resultCount} results for '\${query}'" }
    }

    // One explicit dependency.
    effect query {
        trace .Info { "Searching for '\${query}'" }
    }

    query = "Azora"
    resultCount = 12

    effect defer {
        trace .Debug { "Closing transient search session" }
    }
}

@Reactive
func main() {
    searchSession()
}`,
  },
  {
    title: 'Reactive rem',
    code: `module playground

@Reactive
func checkoutDraft() {
    // rem is saveable state. A host may serialize and restore it after
    // recreation, navigation, process suspension, or page restoration.
    rem customer: String = "Ada"
    rem itemCount: Int = 1
    rem delivery: String = "Standard"

    // Re-run when either explicitly listed value changes.
    effect [itemCount, delivery] {
        trace .Info {
            "Draft updated: \${itemCount} item(s), \${delivery} delivery"
        }
    }

    // Automatic tracking sees customer in the body.
    effect {
        trace .Debug { "Checkout belongs to \${customer}" }
    }

    itemCount = 3
    delivery = "Express"
    customer = "Ada Lovelace"

    effect defer {
        trace .Info { "Persisting checkout draft" }
    }
}

@Reactive
func main() {
    checkoutDraft()
}`,
  },
  {
    title: 'Reactive ret',
    code: `module playground

@Reactive
func playbackSession() {
    // ret is retained state. It survives temporary owner removal and can be
    // reattached when the same retained identity returns.
    ret track: String = "Northern Lights"
    ret elapsedSeconds: Int = 0
    ret playing: Bool = false

    effect playing {
        trace .Info {
            if playing { "Playback started" } else { "Playback paused" }
        }
    }

    effect [track, elapsedSeconds] {
        trace .Debug { "\${track} at \${elapsedSeconds}s" }
    }

    playing = true
    elapsedSeconds = 42

    // Deferred effects clean up resources when the retained owner is disposed.
    effect defer {
        trace .Warn { "Releasing playback session for '\${track}'" }
    }
}

@Reactive
func main() {
    playbackSession()
}`,
  },
  {
    title: 'Iterator Loop Continue',
    code: `module playground

import std.io

pack Iter {
    var i: Int
    var resets: Int
}

impl Iter {
    func reset() { self! ->
        self.resets = self.resets + 1
        self.i = 0
    }
    func hasNext(): Bool { self& ->
        return self.i < 2
    }
    func next(): Int { self! ->
        self.i = self.i + 1
        return self.i
    }
}

func main() {
    var it = Iter(1, 0)
    loop it continue {
        std::println(it.next())
    }
    std::println("resets=\${it.resets}")
}`,
  },
  {
    title: 'Lambdas',
    code: `module playground

import std.io

func apply(f: (Int) -> Int, x: Int): Int {
    return f(x)
}

func makeAdder(n: Int): (Int) -> Int {
    return { x: Int -> x + n }
}

func main() {
    var double = { x: Int -> x * 2 }
    std::println(double(21))

    std::println(apply({ x: Int -> x * x }, 5))

    var add10 = makeAdder(10)
    std::println(add10(32))
}`,
  },
  {
    title: 'Generics',
    code: `module playground

import std.io

func identity<T>(x: T): T {
    return x
}

func first<T, U>(a: T, b: U): T {
    return a
}

pack Box<T> {
    var value: T
}

func main() {
    std::println(identity(42))
    std::println(identity("hello"))
    std::println(first(10, "world"))

    var b = Box(99)
    std::println(b.value)
}`,
  },
  {
    title: 'Traits (spec)',
    code: `module playground

import std.io

pack Point {
    var x: Int
    var y: Int
}

spec Describable {
    func describe(): String
}

impl Describable for Point {
    func describe(): String { self& ->
        return "Point(" + self.x + ", " + self.y + ")"
    }
}

func main() {
    var p = Point(3, 4)
    std::println(p.describe())
}`,
  },
  {
    title: 'Operator Overloading',
    code: `module playground

import std.io

pack Vec2 {
    var x: Int
    var y: Int
}

impl Vec2 {
    func plus(other: Vec2): Vec2 { self& ->
        return Vec2(self.x + other.x, self.y + other.y)
    }
    func equals(other: Vec2): Bool { self& ->
        return self.x == other.x && self.y == other.y
    }
}

func main() {
    var a = Vec2(1, 2)
    var b = Vec2(3, 4)
    var c = a + b
    std::println(c.x)
    std::println(c.y)
    std::println(a == Vec2(1, 2))
}`,
  },
  {
    title: 'Infix Functions',
    code: `module playground

import std.io

infx Int.scaledBy(factor: Int): Int {
    return self * factor
}

func main() {
    std::println(2 scaledBy 3)
    std::println(10 scaledBy 5)
}`,
  },
  {
    title: 'Bitwise Operators',
    code: `module playground

import std.io

func main() {
    var a = 0b1100
    var b = 0b1010
    std::println(a & b)
    std::println(a | b)
    std::println(a ^ b)
    std::println(~a)
    std::println(a << 2)
}`,
  },
  {
    title: 'Default Params',
    code: `module playground

import std.io

func greet(name: String, greeting: String = "Hello"): String {
    return "$greeting, $name!"
}

func main() {
    std::println(greet("Azora"))
    std::println(greet("World", "Hi"))
}`,
  },
  {
    title: 'Guard',
    code: `module playground

import std.io

func half(n: Int): Int {
    guard n > 0 else { return 0 }
    return n / 2
}

func main() {
    std::println(half(10))
    std::println(half(-3))
}`,
  },
  {
    title: 'Nullable Types',
    code: `module playground

import std.io
import std.container.array

func first(nums: Array<Int>): Int? {
    if nums.size == 0 { return null }
    return nums[0]
}

func main() {
    std::println(first(std::arrayOf(7, 8, 9)))
    var v = first(std::arrayOf<Int>())
    if v == null { std::println("empty") }
}`,
  },
  {
    title: 'Maps',
    code: `module playground

import std.io

func main() {
    var scores = ["alice": 90, "bob": 75]
    scores["carol"] = 88
    std::println(scores["alice"])
    std::println(scores["bob"])
    scores["bob"] = 80
    std::println(scores["bob"])
}`,
  },
  {
    title: 'Tagged Unions (slot)',
    code: `module playground

import std.io

slot Shape {
    Circle(Int)
    Rect(Int, Int)
    Empty
}

func area(s: Shape): Int {
    when s {
        Shape.Circle(r) -> { return r * r * 3 }
        Shape.Rect(w, h) -> { return w * h }
        Shape.Empty -> { return 0 }
    }
}

func main() {
    std::println(area(Shape.Circle(5)))
    std::println(area(Shape.Rect(4, 6)))
    std::println(area(Shape.Empty))
}`,
  },
  {
    title: 'Generators (flow)',
    code: `module playground

import std.io

flow squares(n: Int): Int {
    for i in 0..<n {
        yield i * i
    }
}

func main() {
    var sum = 0
    for x in squares(5) {
        sum += x
    }
    std::println(sum)
}`,
  },
  {
    title: 'Dependency Injection',
    code: `module playground

import std.io

solo Counter {
    var n: Int = 0
    func inc(): Int {
        self.n = self.n + 1
        return self.n
    }
}

func main() {
    std::println(inject Counter.inc())
    std::println(inject Counter.inc())
}`,
  },
  {
    title: 'Pointers',
    code: `module playground

import std.io

func main() {
    var p: Int* = alloc arr@[10, 20, 30]
    std::println(*p)
    std::println(*(p + 1))
    *(p + 2) = 99
    std::println(*(p + 2))
}`,
  },
  {
    title: 'Variadic Generics',
    code: `module playground

import std.io

func sumAll<...T>(first: Int, rest: ...T): Int {
    var total = first
    for x in rest {
        total = total + x
    }
    return total
}

func main() {
    std::println(sumAll(1, 2, 3))
    std::println(sumAll(10, 20, 30, 40))
}`,
  },
]
