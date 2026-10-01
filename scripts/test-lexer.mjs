import assert from 'node:assert/strict'
import { StringStream } from '@codemirror/language'
import { azoraLanguage } from '../src/codemirror/azora-language.js'
import definePrism from '../src/data/azora-prism.js'

// Exercise the shipped stream parser, including its separate interpolation path.
const parser = azoraLanguage().streamParser
for (const source of ['a <> b', 'a <=> b', 'size>..0', '"${a <> b}"']) {
  const stream = new StringStream(source, 4)
  const state = parser.startState()
  const tokens = []
  while (!stream.eol()) {
    stream.start = stream.pos
    const kind = parser.token(stream, state)
    assert.ok(stream.pos > stream.start, 'the lexer must advance')
    tokens.push([stream.current(), kind])
  }
  const operator = source.includes('<=>') ? '<=>' : source.includes('<>') ? '<>' : '>..'
  assert.ok(tokens.some(([text, kind]) => text === operator && kind === 'operator'), JSON.stringify(tokens))
}

const prism = { languages: {} }
definePrism(prism)
for (const operator of ['<>', '<=>', '>..']) {
  assert.equal(prism.languages.azora.operator.exec(operator)?.[0], operator)
}
console.log('CodeMirror and Prism exchange, comparison, range and interpolation checks passed')

// New syntax must be styled as syntax; retired spellings are ordinary names.
for (const word of ['async', 'scope', 'variant', 'annot', 'purge', 'remember', 'retain', 'preserve', 'exposed', 'confined', 'val']) {
  const stream = new StringStream(word, 4)
  assert.equal(parser.token(stream, parser.startState()), 'keyword', word)
  assert.equal(prism.languages.azora.keyword.exec(word)?.[0], word)
}
for (const word of ['task', 'zone', 'deco', 'drop', 'mem', 'rem', 'ret', 'ref']) {
  const stream = new StringStream(word, 4)
  assert.notEqual(parser.token(stream, parser.startState()), 'keyword', word)
  assert.equal(prism.languages.azora.keyword.test(word), false, word)
}
console.log('Current and retired Azora vocabulary checks passed')
