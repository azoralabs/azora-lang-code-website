const bundledSources = import.meta.glob('./libraries/*/*.az', {
  eager: true,
  import: 'default',
  query: '?raw',
})

const libraryFiles = Object.freeze([
  Object.freeze({ file: 'render.az', path: 'engine/render/render.az' }),
  Object.freeze({ file: 'shaders.az', path: 'engine/shaders/shaders.az' }),
  Object.freeze({ file: 'input.az', path: 'engine/input/input.az' }),
])

function sourceFor(version, file) {
  return bundledSources[`./libraries/${version}/${file}`]
}

export async function loadEngineWasmAssets(version) {
  const libraries = libraryFiles.map(({ file, path }) => {
    const source = sourceFor(version, file)
    if (typeof source !== 'string') {
      throw new Error(`Azora Engine ${version} is incomplete: bundled library '${file}' is missing`)
    }
    return Object.freeze({ path, source })
  })

  return Object.freeze({ libraries: Object.freeze(libraries) })
}
