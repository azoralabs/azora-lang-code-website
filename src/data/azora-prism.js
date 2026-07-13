/** Azora language definition for Prism / refractor */
export default function azora(Prism) {
  const codeTokens = {
    keyword: /\b(?:var|let|fin|func|return|package|module|use|if|else|inline|deepinline|noinline|zone|friend|test|assert|trace|mixin|panic|for|while|loop|in|by|reverse|break|continue|pack|enum|slot|when|throw|try|catch|impl|spec|defer|typealias|type|as|guard|is|null|oper|infx|fail|alloc|drop|deref|unsafe|isolated|flow|yield|task|async|await|launch|bridge|solo|inject|wrap|rescue|node|leaf|repl|virt|base|mem|rem|ret|effect|view|hook|prop|ctor|dtor|flip|flop|ref|out|mut|shared|weak|expose|confine|protect|protected|threadlocal|deco|where|with|each|self|it)\b/,
    'type-keyword': {
      pattern: /\b(?:Int|Real|Bool|String|Unit|Type|ReturnType|Byte|Short|Long|UInt|ULong|UByte|UShort|Float|Decimal|Char|Size|USize|Cent|UCent|Nothing|Any)\b/,
      alias: 'class-name',
    },
    'builtin-fn': {
      pattern: /\b(?:print|println|delay|hasDeco|getDeco|decoTargets|platform|toString|toInt|toReal|toChar|stringLength|charAt|ord|chr|promote)\b/,
      alias: 'builtin',
    },
    boolean: /\b(?:true|false)\b/,
    'null-literal': {
      pattern: /\bnull\b/,
      alias: 'boolean',
    },
    'type-name': {
      pattern: /\b[A-Z][a-zA-Z0-9_]*\b/,
      alias: 'class-name',
    },
    number: /\b\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?[fFLlduUsSbB]?\b/,
    function: {
      pattern: /\b[a-z_]\w*(?=\s*[\(<])/,
    },
    'plain-var': {
      pattern: /\b[a-z_]\w*\b/,
      alias: 'plain',
    },
    operator: /\.\.<?|\.\.\.?|->|::|[+\-*/%]=?|&&|\|\||[<>!=]=?|!|\?\?|\?\.|\?=|\?[+\-*/%]=|\?\+\+|\?--|[&|^~]|<<=?|>>=?/,
    punctuation: /[{}[\]();:.,<>?]/,
  }

  Prism.languages.azora = {
    'doc-comment': {
      pattern: /\/\*\*(?!\/)[\s\S]*?\*\//,
      greedy: true,
      inside: {
        'doc-tag': /\B@(?:param|return|since|throws|file)\b/,
        'doc-param-name': {
          pattern: /(@param\s+)\w+/,
          lookbehind: true,
        },
      },
    },
    comment: [
      { pattern: /\/\/.*/, greedy: true },
      { pattern: /\/\*[\s\S]*?\*\//, greedy: true },
    ],
    decorator: {
      pattern: /@\w+(?::[\w.]+)?(?:\([^)]*\))?/,
      alias: 'annotation',
    },
    preprocessor: {
      pattern: /\$\w+/,
      alias: 'variable',
    },
    string: {
      pattern: /"(?:[^"\\]|\\[\s\S])*"/,
      greedy: true,
      inside: {
        interpolation: {
          pattern: /\$\{[^}]*\}|\$[a-zA-Z_]\w*/,
          inside: {
            'interpolation-punctuation': {
              pattern: /^\$\{?|\}$/,
              alias: 'punctuation',
            },
            ...codeTokens,
          },
        },
      },
    },
    ...codeTokens,
  }
}
azora.displayName = 'azora'
azora.aliases = []
