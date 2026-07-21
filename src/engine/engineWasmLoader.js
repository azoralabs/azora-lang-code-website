const cache = new Map()

export async function loadEngineWasmAssets(version) {
  if (cache.has(version)) return cache.get(version)

  const loading = (async () => {
    const basePath = `${import.meta.env.BASE_URL}engine/${version}`
    const [renderResponse, shadersResponse] = await Promise.all([
      fetch(`${basePath}/az_web_render.az`),
      fetch(`${basePath}/az_shaders.az`),
    ])

    if (!renderResponse.ok || !shadersResponse.ok) {
      throw new Error(`Azora Engine libraries could not be loaded (${renderResponse.status}/${shadersResponse.status})`)
    }
    const [renderSource, shadersSource] = await Promise.all([
      renderResponse.text(),
      shadersResponse.text(),
    ])

    return Object.freeze({
      libraries: Object.freeze([
        Object.freeze({ path: 'engine/render/az_web_render.az', source: renderSource }),
        Object.freeze({ path: 'engine/shaders/az_shaders.az', source: shadersSource }),
      ]),
    })
  })()

  cache.set(version, loading)
  try {
    return await loading
  } catch (error) {
    cache.delete(version)
    throw error
  }
}
