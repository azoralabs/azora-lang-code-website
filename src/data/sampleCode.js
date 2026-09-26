export const SAMPLE_CODE = `module playground

import std.io

pack App {
    var name: String
}

impl App {
    func &.greet(): String {
        return "Hello from ${'${'}self.name}!"
    }
}

func main() {
    fin app = App("Azora")
    println(app.greet())
}`
