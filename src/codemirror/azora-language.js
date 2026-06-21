import { StreamLanguage } from '@codemirror/language'

const keywords = new Set([
  'var', 'let', 'fin', 'func', 'return', 'package', 'if', 'else',
  'inline', 'deepinline', 'noinline', 'zone', 'friend', 'test',
  'assert', 'trace', 'for', 'while', 'loop', 'in', 'break',
  'continue', 'pack', 'enum', 'when', 'throw', 'try', 'catch',
  'impl', 'self',
])

const types = new Set([
  'Int', 'UInt', 'Long', 'ULong', 'Byte', 'UByte', 'Short', 'UShort',
  'Cent', 'UCent', 'Float', 'Real', 'Decimal', 'Bool', 'Char', 'String',
  'Unit', 'Any',
])

const builtins = new Set([
  'println',
])

const atoms = new Set(['true', 'false'])

const azoraStreamParser = {
  startState() {
    return {
      inString: false, inBlockComment: 0, inDocComment: false, interpolationDepth: 0,
      inParamList: false, parenDepth: 0, paramNames: new Set(), afterFuncKeyword: false,
      afterFuncName: false, localVars: new Set(), afterVarKeyword: false
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
        if (types.has(word)) return 'typeName'
        if (builtins.has(word)) return 'variableName.special'
        if (atoms.has(word)) return 'atom'
        if (/^[A-Z]/.test(word) || word.startsWith('__')) return 'typeName'
        if (stream.peek() === '(') return 'variableName.function'
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
        if (state.inParamList && state.parenDepth === 1) state.inParamList = false
        state.parenDepth--
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
      if (types.has(word)) return 'typeName'
      if (builtins.has(word)) return 'variableName.special'
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

      // Uppercase or __Tup prefix = type name (includes pack names and constructor calls)
      if (/^[A-Z]/.test(word) || word.startsWith('__')) return 'typeName'

      // Inside param list: lowercase identifiers before ':' are param names
      if (state.inParamList && stream.peek() === ':') {
        state.paramNames.add(word)
        return 'variableName.definition'
      }

      // Known param name — light gray
      if (state.paramNames.has(word)) return 'variableName.definition'

      // Known local variable — white even if followed by (
      if (state.localVars.has(word)) return 'variableName'

      // Function call: identifier followed by (
      if (stream.peek() === '(') return 'variableName.function'
      return 'variableName'
    }

    stream.next()
    return null
  },
}

export const azoraLanguage = StreamLanguage.define(azoraStreamParser)
