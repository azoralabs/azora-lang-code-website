const LINE_PREFIX = /(?:^|\s)line\s+(\d+)(?::(\d+))?:\s*/gi
const TRAILING_LINE = /\bat line\s+(\d+)(?::(\d+))?\b/i

function parenthesizedTypeToken(source, lineNumber) {
  const line = String(source || '').split(/\r?\n/)[Number(lineNumber) - 1] || ''
  let match = null

  for (let colon = line.indexOf(':'); colon >= 0; colon = line.indexOf(':', colon + 1)) {
    let start = colon + 1
    while (start < line.length && /\s/.test(line[start])) start += 1
    if (line[start] !== '(') continue

    let depth = 0
    let hasComma = false
    for (let end = start; end < line.length; end += 1) {
      if (line[end] === '(') depth += 1
      else if (line[end] === ')') {
        depth -= 1
        if (depth === 0) {
          if (hasComma) match = line.slice(start, end + 1)
          break
        }
      } else if (line[end] === ',' && depth === 1) {
        hasComma = true
      }
    }
  }

  return match
}

function diagnosticToken(message, source, line) {
  if (/parenthesized type form/i.test(message)) {
    return parenthesizedTypeToken(source, line)
  }

  const patterns = [
    /undefined (?:type|function|variable|symbol) '([^']+)'/i,
    /no (?:member|field|method|property) '([^']+)'/i,
    /unexpected (?:token|symbol) '([^']+)'/i,
    /\bgot '([^']+)'/i,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(message)
    if (match?.[1]) return match[1]
  }
  return null
}

function pushDiagnostic(diagnostics, line, column, message, source) {
  const normalized = message.trim().replace(/\s+/g, ' ')
  if (!normalized) return
  diagnostics.push({
    line: Number(line),
    column: column ? Number(column) : null,
    severity: 'error',
    source: 'Azora compiler',
    message: normalized,
    token: diagnosticToken(normalized, source, line),
  })
}

/**
 * Converts the compiler's text diagnostics into editor-friendly records.
 *
 * A single backend message may contain several `line N: ...` errors, so this
 * parser deliberately scans the complete string instead of splitting only on
 * newlines.
 */
export function parseCompilerDiagnostics(errors, source = '') {
  if (!errors) return []
  const text = String(errors)
  const matches = [...text.matchAll(LINE_PREFIX)]
  const diagnostics = []

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const start = match.index + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length
    pushDiagnostic(diagnostics, match[1], match[2], text.slice(start, end), source)
  }

  if (diagnostics.length === 0) {
    for (const lineText of text.split('\n')) {
      const trailing = TRAILING_LINE.exec(lineText)
      if (!trailing) continue
      const message = lineText.replace(TRAILING_LINE, '').replace(/[:\s-]+$/, '')
      pushDiagnostic(diagnostics, trailing[1], trailing[2], message, source)
    }
  }

  const seen = new Set()
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.line}:${diagnostic.column || ''}:${diagnostic.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
