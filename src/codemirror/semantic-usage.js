const CALLABLE_PATTERN =
  /\b(?:func|task|flow|infx)\s*(?:<[^>{}\n]*>\s*)?(?:[A-Za-z_]\w*\.)?([A-Za-z_]\w*)\s*(?:<[^>{}\n]*>\s*)?\(([^)]*)\)/g
const GENERIC_HEADER_START =
  /\b(?:(?:func|task|flow|infx|pack|spec|deco|node|solo)\s*(?:[A-Za-z_]\w*\s*)?|(?:impl|prop)\s*)</g

function codeOnly(source) {
  const chars = [...source]
  let index = 0
  const mask = (start, end) => {
    for (let offset = start; offset < end; offset += 1) {
      if (chars[offset] !== '\n' && chars[offset] !== '\r') chars[offset] = ' '
    }
  }

  while (index < source.length) {
    if (source.startsWith('//', index)) {
      const start = index
      while (index < source.length && source[index] !== '\n') index += 1
      mask(start, index)
    } else if (source.startsWith('/*', index)) {
      const start = index
      index += 2
      let depth = 1
      while (index < source.length && depth > 0) {
        if (source.startsWith('/*', index)) {
          depth += 1
          index += 2
        } else if (source.startsWith('*/', index)) {
          depth -= 1
          index += 2
        } else {
          index += 1
        }
      }
      mask(start, index)
    } else if (source[index] === '"' || source[index] === "'") {
      const start = index
      const quote = source[index++]
      while (index < source.length) {
        if (source[index] === '\\') index += 2
        else if (source[index++] === quote) break
      }
      mask(start, Math.min(index, source.length))
    } else {
      index += 1
    }
  }
  return chars.join('')
}

function identifierRange(source, absoluteStart, text) {
  const relative = text.search(/[A-Za-z_]/)
  const start = absoluteStart + Math.max(0, relative)
  const match = text.slice(Math.max(0, relative)).match(/^[A-Za-z_]\w*/)
  return { start, end: start + (match?.[0].length || 0) }
}

function genericParameters(source) {
  const names = new Set()
  GENERIC_HEADER_START.lastIndex = 0
  for (const match of source.matchAll(GENERIC_HEADER_START)) {
    const open = match.index + match[0].lastIndexOf('<')
    let index = open + 1
    let depth = 1
    let segmentStart = index
    while (index < source.length && depth > 0) {
      const c = source[index]
      if (c === '<') depth += 1
      else if (c === '>') depth -= 1
      if ((c === ',' && depth === 1) || depth === 0) {
        const segment = source.slice(segmentStart, index).trim()
        const parameter = segment.match(/^(?:\.\.\.)?([A-Za-z_]\w*)/)
        if (parameter) names.add(parameter[1])
        segmentStart = index + 1
      }
      index += 1
    }
  }
  return names
}

function bodyRanges(source, headerPattern) {
  const ranges = []
  headerPattern.lastIndex = 0
  for (const match of source.matchAll(headerPattern)) {
    const open = match.index + match[0].lastIndexOf('{')
    let depth = 1
    let index = open + 1
    while (index < source.length && depth > 0) {
      if (source[index] === '{') depth += 1
      else if (source[index] === '}') depth -= 1
      index += 1
    }
    ranges.push({ start: open + 1, end: Math.max(open + 1, index - 1) })
  }
  return ranges
}

function isInside(ranges, offset) {
  return ranges.some((range) => offset >= range.start && offset < range.end)
}

function semanticContexts(source) {
  const specTypes = new Set()
  for (const match of source.matchAll(
    /\bspec\s*(?:<[^>{}\n]*>\s*)?([A-Za-z_]\w*)(?:\s*<[^>{}\n]*>)?/g,
  )) {
    specTypes.add(match[1])
  }

  const zoneRanges = new Set()
  for (const match of source.matchAll(/\b([a-z_]\w*)\s*(?=::)/g)) {
    const start = match.index + match[0].indexOf(match[1])
    zoneRanges.add(`${start}:${start + match[1].length}`)
  }

  const modulePathRanges = new Set()
  for (const match of source.matchAll(
    /^\s*(?:export\s+)?import\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*(?:\.\*)?)/gm,
  )) {
    const pathStart = match.index + match[0].lastIndexOf(match[1])
    for (const segment of match[1].matchAll(/[A-Za-z_]\w*/g)) {
      const start = pathStart + segment.index
      modulePathRanges.add(`${start}:${start + segment[0].length}`)
    }
  }

  return {
    modulePathRanges,
    overrideBodies: bodyRanges(
      source,
      /\bimpl\s*(?:<[^>{}\n]*>\s*)?[^{}\n]*\bfor\b[^{}\n]*\{/g,
    ),
    specBodies: bodyRanges(
      source,
      /\bspec\s*(?:<[^>{}\n]*>\s*)?[A-Za-z_]\w*(?:\s*<[^>{}\n]*>)?[^{}\n]*\{/g,
    ),
    specTypes,
    zoneRanges,
  }
}

function collectDeclarations(source) {
  const masked = codeOnly(source)
  const callables = []
  const declarationRanges = new Set()

  CALLABLE_PATTERN.lastIndex = 0
  for (const match of masked.matchAll(CALLABLE_PATTERN)) {
    const nameOffset = match[0].indexOf(match[1])
    const nameStart = match.index + nameOffset
    const paramsOffset = match[0].lastIndexOf(match[2])
    const paramsStart = match.index + paramsOffset
    callables.push({
      name: match[1],
      nameStart,
      nameEnd: nameStart + match[1].length,
      params: match[2],
      paramsStart,
      start: match.index,
      end: source.length,
    })
  }

  for (let index = 0; index < callables.length; index += 1) {
    callables[index].end = callables[index + 1]?.start ?? source.length
    declarationRanges.add(`${callables[index].nameStart}:${callables[index].nameEnd}`)
  }

  const parameters = []
  for (const callable of callables) {
    const parameterPattern = /(?:\.\.\.)?([A-Za-z_]\w*)\s*:/g
    for (const match of callable.params.matchAll(parameterPattern)) {
      const relative = match.index + match[0].indexOf(match[1])
      const start = callable.paramsStart + relative
      const declaration = {
        name: match[1],
        start,
        end: start + match[1].length,
        scopeStart: callable.start,
        scopeEnd: callable.end,
      }
      parameters.push(declaration)
      declarationRanges.add(`${declaration.start}:${declaration.end}`)
    }

    const receiverSource = masked.slice(callable.paramsStart + callable.params.length, callable.end)
    const receiverPattern = /\b(self|it)\s*&?\s*->/g
    for (const match of receiverSource.matchAll(receiverPattern)) {
      const start = callable.paramsStart + callable.params.length + match.index
      const declaration = {
        name: match[1],
        start,
        end: start + match[1].length,
        scopeStart: callable.start,
        scopeEnd: callable.end,
      }
      parameters.push(declaration)
      declarationRanges.add(`${declaration.start}:${declaration.end}`)
      break
    }
  }

  const variables = []
  const variablePattern = /\b(?:var|fin|let)\s+([A-Za-z_]\w*)/g
  for (const match of masked.matchAll(variablePattern)) {
    const range = identifierRange(masked, match.index + match[0].indexOf(match[1]), match[1])
    const callable = callables.find((candidate) =>
      range.start >= candidate.start && range.start < candidate.end)
    const declaration = {
      name: match[1],
      start: range.start,
      end: range.end,
      scopeStart: callable?.start ?? 0,
      scopeEnd: callable?.end ?? source.length,
    }
    variables.push(declaration)
    declarationRanges.add(`${declaration.start}:${declaration.end}`)
  }

  const properties = []
  const propertyPattern = /\bprop\s*(?:<[^>{}\n]*>\s*)?([A-Za-z_]\w*)/g
  for (const match of masked.matchAll(propertyPattern)) {
    const start = match.index + match[0].lastIndexOf(match[1])
    const declaration = { name: match[1], start, end: start + match[1].length }
    properties.push(declaration)
    declarationRanges.add(`${declaration.start}:${declaration.end}`)
  }

  return { callables, parameters, variables, properties, declarationRanges }
}

function hasReference(source, spans, declaration, declarationRanges) {
  return spans.some((span) => {
    if (span.start < (declaration.scopeStart ?? 0) ||
        span.end > (declaration.scopeEnd ?? source.length)) return false
    if (declarationRanges.has(`${span.start}:${span.end}`)) return false
    return source.slice(span.start, span.end) === declaration.name
  })
}

export function classifySemanticHighlights(source, spans) {
  const declarations = collectDeclarations(source)
  const masked = codeOnly(source)
  const generics = genericParameters(masked)
  const contexts = semanticContexts(masked)
  const replacements = new Map()

  for (const callable of declarations.callables) {
    const externallyInvoked = callable.name === 'main'
    const used = externallyInvoked ||
      hasReference(
        source,
        spans,
        { ...callable, scopeStart: 0, scopeEnd: source.length },
        declarations.declarationRanges,
      )
    const inOverride = isInside(contexts.overrideBodies, callable.nameStart)
    const inSpec = isInside(contexts.specBodies, callable.nameStart)
    const type = inOverride
      ? (used ? 'override-function' : 'unused-override-function')
      : inSpec
        ? (used ? 'spec-function' : 'unused-spec-function')
        : (used ? null : 'unused')
    if (type) replacements.set(`${callable.nameStart}:${callable.nameEnd}`, type)
  }

  for (const parameter of declarations.parameters) {
    if (!hasReference(source, spans, parameter, declarations.declarationRanges)) {
      replacements.set(`${parameter.start}:${parameter.end}`, 'unused-parameter')
    }
  }

  for (const variable of declarations.variables) {
    if (!hasReference(source, spans, variable, declarations.declarationRanges)) {
      replacements.set(`${variable.start}:${variable.end}`, 'unused')
    }
  }

  for (const property of declarations.properties) {
    const used = hasReference(source, spans, property, declarations.declarationRanges)
    const inOverride = isInside(contexts.overrideBodies, property.start)
    const inSpec = isInside(contexts.specBodies, property.start)
    replacements.set(
      `${property.start}:${property.end}`,
      inOverride
        ? (used ? 'override-property' : 'unused-override-property')
        : inSpec
          ? (used ? 'spec-property' : 'unused-spec-property')
          : (used ? 'property' : 'unused-property'),
    )
  }

  return spans.map((span) => {
    const replacement = replacements.get(`${span.start}:${span.end}`)
    const text = source.slice(span.start, span.end)
    const generic = generics.has(text) &&
      !['annotation', 'comment', 'keyword', 'macro', 'string'].includes(span.type)
    const semanticType = generic
      ? 'generic'
      : contexts.specTypes.has(text)
        ? 'spec-type'
        : contexts.zoneRanges.has(`${span.start}:${span.end}`)
          ? 'zone'
          : contexts.modulePathRanges.has(`${span.start}:${span.end}`)
            ? 'module-path'
          : span.type
    return {
      ...span,
      type: replacement || semanticType,
    }
  })
}
