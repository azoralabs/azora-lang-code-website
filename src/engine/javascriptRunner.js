/**
 * Normalizes generated JavaScript before running it in the browser sandbox.
 */
function stripTypes(tsCode) {
  // Convert TS enums to frozen objects
  let code = tsCode.replace(/enum\s+(\w+)\s*\{([^}]*)\}/g, (_, name, body) => {
    const members = body.split(',').map(m => m.trim()).filter(Boolean)
    const entries = members.map((m) => {
      const clean = m.replace(/\s*=\s*".*"/, '').trim()
      return `  ${clean}: "${name}.${clean}"`
    }).join(',\n')
    return `const ${name} = Object.freeze({\n${entries}\n})`
  })

  return code.split('\n').map(stripLineTypes).join('\n')
}

function stripLineTypes(line) {
  // Strip variable type annotations: let/const/var name: ... =
  const varMatch = line.match(/^(\s*(?:let|const|var)\s+\w+)\s*:/)
  if (varMatch) {
    const eqIdx = findEqualsAfterType(line, varMatch[0].length - 1)
    if (eqIdx > 0) {
      line = varMatch[1] + ' ' + line.substring(eqIdx)
    }
  }

  // Strip function parameter types and return type
  const funcMatch = line.match(/^(\s*(?:async\s+)?function\*?\s+\w+\s*)\(/)
  if (funcMatch) {
    const parenStart = funcMatch[0].length - 1
    const parenEnd = findMatchingParen(line, parenStart)
    if (parenEnd > 0) {
      const params = line.substring(parenStart + 1, parenEnd)
      const strippedParams = stripParamTypes(params)
      // Check for return type after ): strip everything between ) and {
      let rest = line.substring(parenEnd + 1)
      const braceIdx = rest.indexOf('{')
      if (braceIdx >= 0 && rest.trimStart().startsWith(':')) {
        rest = ' ' + rest.substring(braceIdx)
      }
      line = funcMatch[1] + '(' + strippedParams + ')' + rest
    }
  }

  // Strip lambda param types: (x: number) => ...
  line = line.replace(/\((\w+)\s*:\s*\w+\)\s*=>/g, '($1) =>')

  return line
}

function stripParamTypes(params) {
  const result = []
  let i = 0
  while (i < params.length) {
    // Skip whitespace
    while (i < params.length && params[i] === ' ') i++
    // Read param name
    let name = ''
    while (i < params.length && /\w/.test(params[i])) { name += params[i]; i++ }
    // Skip whitespace
    while (i < params.length && params[i] === ' ') i++
    // If colon, skip the type annotation
    if (i < params.length && params[i] === ':') {
      i++ // skip ':'
      // Skip the type, tracking parens/angles
      let depth = 0
      while (i < params.length) {
        const c = params[i]
        if (c === '(' || c === '<') depth++
        else if (c === ')') depth--
        else if (c === '>' && i > 0 && params[i - 1] === '=') { /* skip => */ }
        else if (c === '>') depth--
        else if (c === ',' && depth === 0) break
        i++
      }
    }
    result.push(name)
    // Skip comma
    if (i < params.length && params[i] === ',') i++
  }
  return result.join(', ')
}

function findMatchingParen(str, openIdx) {
  let depth = 1
  for (let i = openIdx + 1; i < str.length; i++) {
    if (str[i] === '(') depth++
    else if (str[i] === ')') { depth--; if (depth === 0) return i }
  }
  return -1
}

function findEqualsAfterType(line, colonIdx) {
  let depth = 0
  for (let i = colonIdx + 1; i < line.length; i++) {
    const c = line[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === '<') depth++
    else if (c === '>' && i > 0 && line[i - 1] === '=') { /* skip => arrow */ }
    else if (c === '>') depth--
    else if (c === '=' && depth === 0 && line[i + 1] !== '>') return i
  }
  return -1
}

export async function runJavaScript(jsCode) {
  const output = []
  const errors = []

  // Capture console output
  const origLog = console.log
  const origError = console.error
  const origWarn = console.warn

  console.log = (...args) => output.push(args.map(String).join(' '))
  console.error = (...args) => errors.push(args.map(String).join(' '))
  console.warn = (...args) => output.push(args.map(String).join(' '))

  // Provide process.stdout.write for print() mapping
  const origProcess = globalThis.process
  globalThis.process = {
    ...globalThis.process,
    stdout: { write: (s) => { output.push(s) } },
  }

  try {
    const fn = new Function(stripTypes(jsCode))
    const result = fn()
    // If the code returns a promise (async), await it
    if (result && typeof result.then === 'function') {
      await result
    }
    return {
      success: errors.length === 0,
      output: output.join('\n'),
      errors: errors.join('\n'),
    }
  } catch (e) {
    return {
      success: false,
      output: output.join('\n'),
      errors: e.message || String(e),
    }
  } finally {
    console.log = origLog
    console.error = origError
    console.warn = origWarn
    globalThis.process = origProcess
  }
}
