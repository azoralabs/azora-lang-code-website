// Example snippets shown in the playground's Example selector.
// Every example compiles and runs on the current (IR-based) Azora compiler.
export const codeExamples = [
  {
    title: 'Hello World',
    code: `module playground

func main() {
    println("Hello, world!")
}`,
  },
  {
    title: 'Variables',
    code: `module playground

func main() {
    var count = 0
    count = count + 1
    count += 5

    fin name = "Azora"
    let greeting = "Hello, \${name}!"

    println(greeting)
    println("count is \${count}")
}`,
  },
  {
    title: 'Functions',
    code: `module playground

func add(a: Int, b: Int): Int {
    return a + b
}

func factorial(n: Int): Int {
    if n <= 1 { return 1 }
    return n * factorial(n - 1)
}

func main() {
    println("\${add(3, 4)}")
    println("\${factorial(5)}")
}`,
  },
  {
    title: 'Control Flow',
    code: `module playground

func main() {
    var sum = 0
    for i in 1..10 {
        sum += i
    }
    println("sum 1..10 = \${sum}")

    var i = 0
    loop {
        i += 1
        if i == 7 { break }
    }
    println("stopped at \${i}")

    var evens = 0
    for n in 0..<10 {
        if n % 2 != 0 { continue }
        evens += 1
    }
    println("even count = \${evens}")
}`,
  },
  {
    title: 'Lists',
    code: `module playground
use zone std

func main() {
    var nums = MutableList<Int>()
    nums.add(10)
    nums.add(20)
    nums.add(30)
    println(nums[0])
    println(nums.size)

    nums.add(40)
    nums[0] = 99
    println(nums.size)
    println(nums[0])

    var total = 0
    for i in 0..<nums.size {
        total += nums[i]
    }
    println("total = \${total}")
}`,
  },
  {
    title: 'Strings',
    code: `module playground

func main() {
    var name = "Azora"
    var n = 3

    println("Hello, \$name!")
    println("\${n} x \${n} = \${n * n}")
    println("ab" * 3)
    println("length is \${name.length}")
}`,
  },
  {
    title: 'Structs (pack)',
    code: `module playground
use zone std

pack Point {
    var x: Int
    var y: Int
}

func main() {
    var p = Point(3, 4)
    println("\${p.x}, \${p.y}")

    p.x = 10
    p.y += 1
    println("\${p.x}, \${p.y}")

    var points = listOf(Point(1, 1), Point(2, 2), Point(3, 3))
    println("last = \${points[2].x}, \${points[2].y}")
}`,
  },
  {
    title: 'Operators & Ranges',
    code: `module playground

func main() {
    var n = 10
    n += 5
    n *= 2
    println(n)

    println(17 / 5)
    println(17 % 5)

    var sum = 0
    for i in 1..<5 {
        sum += i
    }
    println("sum 1..<5 = \${sum}")
}`,
  },
  {
    title: 'Scopes',
    code: `module playground

func main() {
    var x = 1
    zone {
        var x = 2
        println("inner \${x}")
        println("outer \${::x}")
    }
    println("after \${x}")
}`,
  },
  {
    title: 'Compile-Time Execution',
    code: `module playground

inline func square(x: Int): Int {
    return x * x
}

func main() {
    inline fin SIZE = 8
    println("size: \${SIZE}")
    println("squared: \${square(5)}")
}`,
  },
  {
    title: 'Testing',
    code: `module playground

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
    println("running tests...")
}`,
  },
  {
    title: 'Enums & When',
    code: `module playground

enum Light {
    Red
    Yellow
    Green
}

func action(l: String): String {
    when l {
        Light.Red -> { return "stop" }
        Light.Yellow -> { return "slow" }
        Light.Green -> { return "go" }
        else -> { return "unknown" }
    }
}

func main() {
    println(action(Light.Green))
    println(action(Light.Red))
}`,
  },
  {
    title: 'Tuples',
    code: `module playground

func divmod(a: Int, b: Int): (Int, Int) {
    return (a / b, a % b)
}

func main() {
    fin r = divmod(17, 5)
    println("quotient: \${r.0}")
    println("remainder: \${r.1}")

    fin pair = (1, "hello")
    println(pair.0)
    println(pair.1)
}`,
  },
  {
    title: 'Error Handling',
    code: `module playground

func safeDiv(a: Int, b: Int): Int {
    if b == 0 { throw "division by zero" }
    return a / b
}

func main() {
    println(safeDiv(10, 2) catch -1)
    println(safeDiv(10, 0) catch -1)

    try {
        throw "boom"
    } catch { e ->
        println("caught: " + e)
    }
}`,
  },
  {
    title: 'Impl Methods',
    code: `module playground
use zone std

pack Point {
    var x: Int
    var y: Int
}

impl pack Point {
    func lengthSquared(): Int {
        return self.x * self.x + self.y * self.y
    }
    func moveBy(dx: Int, dy: Int) {
        self.x = self.x + dx
        self.y = self.y + dy
    }
}

func main() {
    var p = Point(3, 4)
    println(p.lengthSquared())
    p.moveBy(10, 20)
    println(p.lengthSquared())
}`,
  },

  {
    title: 'Extension Methods',
    code: `module playground

pack Counter {
    var value: Int
}

impl pack Counter {
    func bump() {
        self.value = self.value + 1
    }
}

func Counter.peek(): Int { ref self ->
    return self.value
}

func main() {
    var c = Counter(40)
    c.bump()
    println("value=\${c.peek()}")
}`,
  },
  {
    title: 'Reactive mem/rem/ret',
    code: `module playground

func main() {
    mem local: Int = 1
    rem saved: Int = 2
    ret kept: Int = 3
    println(local + saved + kept)
}`,
  },
  {
    title: 'Iterator Loop Continue',
    code: `module playground

pack Iter {
    var i: Int
    var resets: Int
}

impl pack Iter {
    func reset() {
        self.resets = self.resets + 1
        self.i = 0
    }
    func hasNext(): Bool {
        return self.i < 2
    }
    func next(): Int {
        self.i = self.i + 1
        return self.i
    }
}

func main() {
    var it = Iter(1, 0)
    loop it continue {
        println(it.next())
    }
    println("resets=\${it.resets}")
}`,
  },
  {
    title: 'Lambdas',
    code: `module playground

func apply(f: (Int) -> Int, x: Int): Int {
    return f(x)
}

func makeAdder(n: Int): (Int) -> Int {
    return { x: Int -> x + n }
}

func main() {
    var double = { x: Int -> x * 2 }
    println(double(21))

    println(apply({ x: Int -> x * x }, 5))

    var add10 = makeAdder(10)
    println(add10(32))
}`,
  },
  {
    title: 'Generics',
    code: `module playground

func<T> identity(x: T): T {
    return x
}

func<T, U> first(a: T, b: U): T {
    return a
}

pack Box<T> {
    var value: T
}

func main() {
    println(identity(42))
    println(identity("hello"))
    println(first(10, "world"))

    var b = Box(99)
    println(b.value)
}`,
  },
  {
    title: 'Traits (spec)',
    code: `module playground
use zone std

pack Point {
    var x: Int
    var y: Int
}

spec Describable {
    func describe(): String
}

impl Describable for Point {
    func describe(): String {
        return "Point(" + self.x + ", " + self.y + ")"
    }
}

func main() {
    var p = Point(3, 4)
    println(p.describe())
}`,
  },
  {
    title: 'Operator Overloading',
    code: `module playground

pack Vec2 {
    var x: Int
    var y: Int
}

impl pack Vec2 {
    func plus(other: Vec2): Vec2 {
        return Vec2(self.x + other.x, self.y + other.y)
    }
    func equals(other: Vec2): Bool {
        return self.x == other.x && self.y == other.y
    }
}

func main() {
    var a = Vec2(1, 2)
    var b = Vec2(3, 4)
    var c = a + b
    println(c.x)
    println(c.y)
    println(a == Vec2(1, 2))
}`,
  },
  {
    title: 'Infix Functions',
    code: `module playground

infx Int.shl(bits: Int): Int {
    return self * bits
}

func main() {
    println(2 shl 3)
    println(10 shl 5)
}`,
  },
  {
    title: 'Bitwise Operators',
    code: `module playground

func main() {
    var a = 0b1100
    var b = 0b1010
    println(a & b)
    println(a | b)
    println(a ^ b)
    println(~a)
    println(a << 2)
}`,
  },
  {
    title: 'Default Params',
    code: `module playground

func greet(name: String, greeting: String = "Hello"): String {
    return "$greeting, $name!"
}

func main() {
    println(greet("Azora"))
    println(greet("World", "Hi"))
}`,
  },
  {
    title: 'Guard',
    code: `module playground

func half(n: Int): Int {
    guard n > 0 else { return 0 }
    return n / 2
}

func main() {
    println(half(10))
    println(half(-3))
}`,
  },
  {
    title: 'Nullable Types',
    code: `module playground

func first(nums: [Int]): Int? {
    if nums.length == 0 { return null }
    return nums[0]
}

func main() {
    println(first([7, 8, 9]))
    var v = first([])
    if v == null { println("empty") }
}`,
  },
  {
    title: 'Maps',
    code: `module playground

func main() {
    var scores = ["alice": 90, "bob": 75]
    scores["carol"] = 88
    println(scores["alice"])
    println(scores["bob"])
    scores["bob"] = 80
    println(scores["bob"])
}`,
  },
  {
    title: 'Tagged Unions (slot)',
    code: `module playground

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
    println(area(Shape.Circle(5)))
    println(area(Shape.Rect(4, 6)))
    println(area(Shape.Empty))
}`,
  },
  {
    title: 'Inheritance',
    code: `module playground

node Animal(name: String) {
    func speak(): String {
        return "..."
    }
}

leaf Dog(name: String) : Animal(name) {
    repl func speak(): String {
        return "Woof"
    }
}

func main() {
    var d: Animal = Dog("Rex")
    println(d.speak())
}`,
  },
  {
    title: 'Generators (flow)',
    code: `module playground

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
    println(sum)
}`,
  },
  {
    title: 'Dependency Injection',
    code: `module playground

solo Counter {
    var n: Int = 0
    func inc(): Int {
        self.n = self.n + 1
        return self.n
    }
}

func main() {
    println(inject Counter.inc())
    println(inject Counter.inc())
}`,
  },
  {
    title: 'Pointers',
    code: `module playground

func main() {
    var p: Int* = alloc [10, 20, 30]
    println(*p)
    println(*(p + 1))
    *(p + 2) = 99
    println(*(p + 2))
}`,
  },
  {
    title: 'Variadic Generics',
    code: `module playground

func<...T> sumAll(first: Int, rest: ...T): Int {
    var total = first
    for x in rest {
        total = total + x
    }
    return total
}

func main() {
    println(sumAll(1, 2, 3))
    println(sumAll(10, 20, 30, 40))
}`,
  },
]
