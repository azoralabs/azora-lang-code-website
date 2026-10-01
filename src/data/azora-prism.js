/** Azora language definition for Prism / refractor */
export default function azora(Prism) {
  const codeTokens = {
    keyword: /\b(?:__float|__int|__uint|alloc|annot|as|assert|assoc|async|await|bind|binds|break|bridge|by|catch|confined|continue|ctor|deepinline|defer|delay|derive|derives|direct|dtor|effect|else|enum|error|escaping|exposed|factory|false|fin|for|func|graph|if|impl|import|in|includes|inject|inline|is|lazy|lend|let|literal|loop|macro|module|noinline|null|oper|out|pack|panic|preserve|prop|protected|purge|react|remember|requires|rescue|retain|return|scope|scoped|seal|solo|spec|take|test|then|threadlocal|throw|trace|true|try|typealias|union|unsafe|using|val|var|variant|when|where|while|with|without)\b/,
    parameter: /\b(?:self|it)\b/,
    'type-keyword': {
      pattern: /\b(?:Int|Double|Bool|String|Unit|Type|ReturnType|Byte|Short|Long|UInt|ULong|UByte|UShort|Float|Quad|Char|Size|USize|Cent|UCent|Nothing|Any)\b/,
      alias: 'class-name',
    },
    'builtin-fn': {
      pattern: /\b(?:print|println|delay|hasAnnot|annotMeta|platform|toString|toInt|toReal|toChar|stringLength|charAt|ord|chr|promote)\b/,
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
    operator: /<=>|<>|>\.\.|\.\.\.|\.\.<|\.\.|->|::|[+\-*/%]=?|&&|\|\||[<>!=]=?|!|\?\?|\?\.|\?=|\?[+\-*/%]=|\?\+\+|\?--|[&|^~]|<<=?|>>=?/,
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
    macro: {
      pattern: /@[a-z_]\w*[!?&*^]?/,
      alias: 'variable',
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
