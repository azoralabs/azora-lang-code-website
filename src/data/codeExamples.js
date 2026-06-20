// Example snippets shown in the playground's Example selector.
// Every example compiles and runs on the current (IR-based) Azora compiler.
export const codeExamples = [
  {
    title: 'Hello World',
    code: `package playground

func main() {
    println("Hello, world!")
}`,
  },
  {
    title: 'Variables',
    code: `package playground

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
    code: `package playground

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
    code: `package playground

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
    title: 'Arrays',
    code: `package playground

func main() {
    var nums = [10, 20, 30]
    println(nums[0])
    println(nums.length)

    nums.add(40)
    nums[0] = 99
    println(nums.length)
    println(nums[0])

    var total = 0
    for i in 0..<nums.length {
        total += nums[i]
    }
    println("total = \${total}")
}`,
  },
  {
    title: 'Strings',
    code: `package playground

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
    code: `package playground

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

    var points = [Point(1, 1), Point(2, 2), Point(3, 3)]
    println("last = \${points[2].x}, \${points[2].y}")
}`,
  },
  {
    title: 'Operators & Ranges',
    code: `package playground

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
    code: `package playground

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
    code: `package playground

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
    code: `package playground

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
]
