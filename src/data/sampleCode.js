export const SAMPLE_CODE = `module playground

import std.io
import std.container.tuple

pack App {
    var name: String
}

impl App {
    func greet(): String { ref self ->
        return "Hello from ${'${'}self.name}!"
    }
}

func main() {
    fin app = App("Azora")
    std::println(std::tupleOf(app.greet(), ":)"))
}`
