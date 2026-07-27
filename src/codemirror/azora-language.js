import { StreamLanguage } from '@codemirror/language'

const keywords = new Set([
  'var', 'let', 'fin', 'func', 'return', 'package', 'module', 'if', 'else',
  'inline', 'deepinline', 'noinline', 'zone', 'friend', 'test',
  'assert', 'trace', 'mixin', 'panic', 'for', 'while', 'loop', 'in', 'by', 'reverse', 'break',
  'continue', 'shield', 'pack', 'enum', 'slot', 'when', 'throw', 'try', 'catch', 'rescue',
  'impl', 'spec', 'self', 'as', 'guard', 'is', 'null', 'use', 'typealias',
  'defer', 'node', 'leaf', 'repl', 'virt', 'base', 'fail',
  'flow', 'yield', 'task', 'await', 'launch',
  'alloc', 'drop', 'deref', 'unsafe', 'isolated', 'bridge',
  'solo', 'inject', 'wrap', 'deco',
  'mem', 'rem', 'ret', 'effect', 'view', 'hook', 'prop', 'ctor', 'dtor', 'flip', 'flop',
  'oper', 'infx', 'threadlocal',
  'expose', 'confine', 'protect', 'protected', 'shield', 'ref', 'out', 'mut', 'shared', 'weak',
])

const types = new Set([
  'Int', 'UInt', 'Long', 'ULong', 'Byte', 'UByte', 'Short', 'UShort',
  'Cent', 'UCent', 'Float', 'Real', 'Decimal', 'Bool', 'Char', 'String',
  'Unit', 'Any',
])

const atoms = new Set(['true', 'false'])

function codeOnly(source) {
  const chars = [...source]
  let index = 0
  const mask = (start, end) => {
    for (let offset = start; offset < end; offset += 1) {
      if (chars[offset] !== '\n') chars[offset] = ' '
    }
  }

  while (index < source.length) {
    if (source[index] === '"' || source[index] === "'") {
      const start = index
      const quote = source[index]
      index += 1
      while (index < source.length) {
        if (source[index] === '\\') index += 2
        else if (source[index++] === quote) break
      }
      mask(start, Math.min(index, source.length))
    } else if (source.startsWith('//', index)) {
      const start = index
      while (index < source.length && source[index] !== '\n') index += 1
      mask(start, index)
    } else if (source.startsWith('/*', index)) {
      const start = index
      index += 2
      while (index < source.length && !source.startsWith('*/', index)) index += 1
      index = Math.min(source.length, index + 2)
      mask(start, index)
    } else {
      index += 1
    }
  }
  return chars.join('')
}

function semanticNames(source, resolvedReferences) {
  const functions = new Set()
  const variables = new Set()
  const declaredTypes = new Set(types)
  const declarations = codeOnly(source)

  for (const match of declarations.matchAll(/\b(?:func|task|flow|hook)\s+([A-Za-z_]\w*)/g)) {
    functions.add(match[1])
  }
  for (const match of declarations.matchAll(/\b(?:var|fin|let)\s+([A-Za-z_]\w*)/g)) {
    variables.add(match[1])
  }
  for (const match of declarations.matchAll(/\b(?:pack|enum|spec|solo|node|slot)\s+([A-Za-z_]\w*)/g)) {
    declaredTypes.add(match[1])
  }
  if (resolvedReferences) {
    for (const match of declarations.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
      functions.add(match[1])
    }
    for (const match of declarations.matchAll(/:\s*([A-Za-z_]\w*)/g)) {
      declaredTypes.add(match[1])
    }
  }
  return { functions, variables, types: declaredTypes }
}

function createAzoraStreamParser(names) {
  return {
    startState() {
      return {
        inString: false, inBlockComment: 0, inDocComment: false, interpolationDepth: 0,
        inParamList: false, parenDepth: 0, paramNames: new Set(), afterFuncKeyword: false,
        afterFuncName: false, awaitingFunctionBody: false, functionBodyDepth: 0, braceDepth: 0,
        localVars: new Set(), afterVarKeyword: false
      }
    },

    token(stream, state) {
    // Block/doc comments
    if (state.inBlockComment > 0 || state.inDocComment) {
      while (!stream.eol()) {
        if (stream.match('*/')) {
          if (state.inDocComment) state.inDocComment = false
          else state.inBlockComment--
          return state.inDocComment ? 'comment' : 'comment'
        }
        if (stream.match('/*')) {
          state.inBlockComment++
        } else {
          stream.next()
        }
      }
      return state.inDocComment ? 'meta' : 'comment'
    }

    if (stream.eatSpace()) return null

    // Doc comment start
    if (stream.match('/**')) {
      if (stream.match('/')) return 'comment' // /**/
      state.inDocComment = true
      return 'meta'
    }

    // Block comment start
    if (stream.match('/*')) {
      state.inBlockComment++
      return 'comment'
    }

    // Line comment
    if (stream.match('//')) {
      stream.skipToEnd()
      return 'lineComment'
    }

    // Macro (e.g. tup@, arr@)
    if (stream.match(/[a-z_]\w*@/)) {
      return 'special'
    }

    // Decorator
    if (stream.match(/@\w+/)) {
      stream.match(/(?::[\w.]+)?(?:\([^)]*\))?/)
      return 'meta'
    }

    // Inside string interpolation ${...} — parse as code
    if (state.interpolationDepth > 0) {
      if (stream.peek() === '}') {
        stream.next()
        state.interpolationDepth--
        if (state.interpolationDepth === 0) {
          state.inString = true
        }
        return 'punctuation'
      }
      if (stream.peek() === '{') {
        stream.next()
        state.interpolationDepth++
        return 'punctuation'
      }
      // Parse code tokens inside interpolation
      if (stream.eatSpace()) return null
      if (stream.match(/\b\d[\d_]*(?:\.[\d_]+)?\b/)) return 'number'
      if (stream.match(/[+\-*/%]=?|&&|\|\||[<>!=]=?/)) return 'operator'
      if (stream.match(/[(),.:]/)) return 'punctuation'
      if (stream.match(/[a-zA-Z_]\w*/)) {
        const word = stream.current()
        if (keywords.has(word)) return 'keyword'
        if (state.paramNames.has(word)) return 'variableName.definition'
        if (names.variables.has(word)) return 'variableName'
        if (names.types.has(word)) return 'typeName'
        if (names.functions.has(word)) return 'variableName.function'
        if (atoms.has(word)) return 'atom'
        return 'variableName'
      }
      stream.next()
      return null
    }

    // String (with interpolation support)
    if (state.inString || stream.match('"')) {
      if (!state.inString) state.inString = true
      while (!stream.eol()) {
        // Peek ahead: if next is ${ , stop here and return string so far
        if (stream.peek() === '$') {
          const pos = stream.pos
          if (pos + 1 < stream.string.length && stream.string[pos + 1] === '{') {
            if (pos > stream.start) {
              // Return the string portion before ${
              return 'string'
            }
            // We're at the start — consume ${ as punctuation
            stream.next() // $
            stream.next() // {
            state.interpolationDepth = 1
            state.inString = false
            return 'punctuation'
          }
        }
        const ch = stream.next()
        if (ch === '\\') {
          stream.next()
        } else if (ch === '"') {
          state.inString = false
          return 'string'
        }
      }
      return 'string'
    }

    // Numbers
    if (stream.match(/\b\d[\d_]*(?:\.[\d_]+)?\b/)) {
      return 'number'
    }

    // Operators
    if (stream.match(/\.\.\.?|->|::|&&|\|\||[<>!=]=?|[+\-*/%]=?|\?\??/)) {
      return 'operator'
    }

    // Punctuation — track param list state
    if (stream.match(/[{}[\]();:.,<>?]/)) {
      const ch = stream.current()
      if (ch === '(') {
        state.parenDepth++
        if (state.afterFuncName) {
          state.inParamList = true
          state.afterFuncName = false
        }
      } else if (ch === ')') {
        if (state.inParamList && state.parenDepth === 1) {
          state.inParamList = false
          state.awaitingFunctionBody = true
        }
        state.parenDepth--
      } else if (ch === '{') {
        state.braceDepth++
        if (state.awaitingFunctionBody) {
          state.functionBodyDepth = state.braceDepth
          state.awaitingFunctionBody = false
        }
      } else if (ch === '}') {
        if (state.functionBodyDepth === state.braceDepth) {
          state.paramNames = new Set()
          state.functionBodyDepth = 0
        }
        state.braceDepth = Math.max(0, state.braceDepth - 1)
      }
      return 'punctuation'
    }

    // Identifiers and keywords
    if (stream.match(/[a-zA-Z_]\w*/)) {
      const word = stream.current()
      if (keywords.has(word)) {
        if (word === 'func' || word === 'task' || word === 'flow' || word === 'hook' || word === 'test') {
          state.afterFuncKeyword = true
          state.paramNames = new Set()
        }
        if (word === 'fin' || word === 'var') {
          state.afterVarKeyword = true
        }
        return 'keyword'
      }
      if (atoms.has(word)) return 'atom'

      // Track local variable names after fin/var
      if (state.afterVarKeyword) {
        state.afterVarKeyword = false
        state.localVars.add(word)
        return 'variableName'
      }

      // Function/task/flow/hook name — orange
      if (state.afterFuncKeyword) {
        state.afterFuncKeyword = false
        state.afterFuncName = true
        return 'variableName.function'
      }

      // Inside param list: lowercase identifiers before ':' are param names
      if (state.inParamList && stream.peek() === ':') {
        state.paramNames.add(word)
        return 'variableName.definition'
      }

      // Known param name — light gray
      if (state.paramNames.has(word)) return 'variableName.definition'

      // Known local variable — white even if followed by (
      if (state.localVars.has(word) || names.variables.has(word)) return 'variableName'

      // Types keep type coloring when invoked as constructors.
      if (names.types.has(word)) return 'typeName'

      // Only declarations discovered in this document are callable symbols.
      if (names.functions.has(word)) return 'variableName.function'

      return 'variableName'
    }

    stream.next()
    return null
    },
  }
}

export function azoraLanguage(source = '', { resolvedReferences = false } = {}) {
  return StreamLanguage.define(createAzoraStreamParser(semanticNames(source, resolvedReferences)))
}
