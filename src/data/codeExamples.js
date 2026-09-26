// Example snippets shown in the playground's Example selector.
//
// Verified against the compiler, not by hand: `node scripts/check-examples.mjs`
// type-checks every snippet here and `--run` executes the ones with a main().
// Keep that green when editing.
export const codeExamples = [
  {
    title: 'Hello World',
    code: `module playground

import std.io

func main() {
    println("Hello, world!")
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

    println(greeting)
    println("count is \${count}")
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
    println("\${add(3, 4)}")
    println("\${factorial(5)}")
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

import std.io
import std.container.list

func main() {
    var nums = mutableListOf<Int>()
    nums.add(10)
    nums.add(20)
    nums.add(30)
    println(nums[0])
    println(nums.size)

    nums.add(40)
    nums.set(0, 99)
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

import std.io

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

import std.io
import std.container.list

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
    var last: Point = points[2]
    println("last = \${last.x}, \${last.y}")
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

import std.io

scope geometry {
    func area(w: Int, h: Int): Int { return w * h }
    func perimeter(w: Int, h: Int): Int { return 2 * (w + h) }
}

func main() {
    println("area: \${geometry::area(3, 4)}")
    println("perimeter: \${geometry::perimeter(3, 4)}")
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
    assert factorial(5) == 120 panic "5! should be 120"
}

test "factorial of 0 is 1" {
    assert factorial(0) == 1 panic "0! should be 1"
}

func main() {
    println("running tests...")
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
    println(action(Light.Green))
    println(action(Light.Red))
}`,
  },
  {
    title: 'Tuples',
    code: `module playground

import std.io
import std.container.tuple

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

import std.io

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

import std.io

pack Point {
    var x: Int
    var y: Int
}

impl Point {
    func &.lengthSquared(): Int {
        return self.x * self.x + self.y * self.y
    }
    func !.moveBy(dx: Int, dy: Int) {
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

import std.io

pack Counter {
    var value: Int
}

impl Counter {
    // & is a shared, read-only receiver; ! is exclusive and may write.
    func !.bump() {
        self.value = self.value + 1
    }
    func &.peek(): Int {
        return self.value
    }
}

func main() {
    var c = Counter(40)
    c.bump()
    println("value=\${c.peek()}")
}`,
  },
  {
    title: 'Reactive remember',
    code: `module playground

import std.io

react func searchSession() {
    // remember state survives a rerun of this reactive owner,
    // but not the owner being recreated.
    remember var query: String = ""
    remember var resultCount: Int = 0

    // No dependency list: dependencies are inferred from what the body reads.
    effect {
        println("Rendering \${resultCount} results for '\${query}'")
    }

    // One explicit dependency.
    effect query {
        println("Searching for '\${query}'")
    }

    query = "Azora"
    resultCount = 12

    effect defer {
        println("Closing transient search session")
    }
}

react func main() {
    searchSession()
}`,
  },
  {
    title: 'Reactive retain',
    code: `module playground

import std.io

pack Customer {
    var name: String
}

react func customerPanel() {
    // retain survives the owner being recreated, within the process.
    retain fin customer = Customer("Ada")
    remember var visits: Int = 0

    effect {
        println("\${customer.name} has \${visits} visit(s)")
    }

    visits = visits + 1
}

react func main() {
    customerPanel()
}`,
  },
  {
    title: 'Reactive preserve',
    code: `module playground

import std.io

pack Draft {
    var body: String
}

react func editor() {
    // preserve state can be snapshotted and restored by a host.
    preserve var draft = Draft("")
    remember var saved: Bool = false

    effect draft {
        println("draft is now '\${draft.body}'")
    }

    draft = Draft("hello from Azora")
    saved = true
    println("saved=\${saved}")
}

react func main() {
    editor()
}`,
  },
  {
    title: 'Iteration',
    code: `module playground

import std.io

func main() {
    fin rows = [10, 20, 30]

    // 'for x in <iterable>' walks something; 'loop { }' repeats.
    for row in rows {
        if row == 20 { continue }
        println(row)
    }

    var n = 0
    loop {
        n = n + 1
        if n == 3 { break }
    }
    println("n=\${n}")
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
    // A lambda states what it captures: [n] copies, [n.&] borrows,
    // [n.!] borrows mutably, [&] captures whatever the body reads.
    return [n] { x: Int -> x + n }
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

import std.io

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

import std.io

pack Point {
    var x: Int
    var y: Int
}

spec Describable {
    func describe(): String
}

impl Describable for Point {
    func &.describe(): String {
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

import std.io

pack Vec2 {
    var x: Int
    var y: Int
}

impl Vec2 {
    func &.plus(other: Vec2): Vec2 {
        return Vec2(self.x + other.x, self.y + other.y)
    }
    func &.equals(other: Vec2): Bool {
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
    title: 'Infix Macros',
    code: `module playground

import std.io

func scaled(value: Int, factor: Int): Int {
    return value * factor
}

// Infix calls are declared as macros, not as a function form.
macro $a @scaledBy $b => scaled($a, $b)

func main() {
    println(2 @scaledBy 3)
    println(10 @scaledBy 5)
}`,
  },
  {
    title: 'Bitwise Operators',
    code: `module playground

import std.io

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

import std.io

func greet(name: String, greeting: String = "Hello"): String {
    return "$greeting, $name!"
}

func main() {
    println(greet("Azora"))
    println(greet("World", "Hi"))
}`,
  },
  {
    title: 'Early Return',
    code: `module playground

import std.io

func half(n: Int): Int {
    if n <= 0 { return 0 }
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

import std.io

pack User {
    var nickname: String?
}

func main() {
    var maybe: Int? = null
    println(maybe ?? 7)

    maybe = 42
    println(maybe ?? 7)

    // A null check narrows the type for the rest of the branch.
    if maybe != null {
        println(maybe + 1)
    }

    fin user = User(null)
    println(user.nickname ?? "anonymous")
    println(user.nickname?.size ?? 0)
}`,
  },
  {
    title: 'Maps',
    code: `module playground

import std.io

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
    title: 'Tagged Unions (variant enum)',
    code: `module playground

import std.io

variant enum Shape {
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
    title: 'Generators (Sequence)',
    code: `module playground

import std.io
import std.container.list
import std.concurrency.generators

// Sequence<T> and Flow<T> are library types, not language constructs:
// a producer stays an ordinary func and only its return type says which
// kind of stream it builds.
func squares(n: Int): Sequence<Int> = sequence<Int> [!] s: SequenceScope<Int> {
    for i in 0..<n {
        yield(i * i)
    }
}

func main() {
    fin produced = squares(5).items
    var sum = 0
    for i in 0..<produced.size {
        sum = sum + produced[i]
    }
    println(sum)
}`,
  },
  {
    title: 'Dependency Injection',
    code: `module playground

import std.io

solo pack Counter {
    var n: Int = 0
}

impl Counter {
    func !.inc(): Int {
        self.n = self.n + 1
        return self.n
    }
}

graph AppGraph {
    solo Counter()
}

func main() {
    var counter = inject Counter
    println(counter.inc())
    println(counter.inc())
}`,
  },
  {
    title: 'Pointers',
    code: `module playground

import std.io

func main() {
    // alloc yields a read-only T*; alloc^ yields a writable T^.
    var cell: Int^ = alloc^ 10
    println(*cell)

    *cell = 99
    println(*cell)

    purge cell
}`,
  },
  {
    title: 'Variadic Generics',
    code: `module playground

import std.io

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
