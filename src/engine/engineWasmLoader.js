const cache = new Map()

export async function loadEngineWasmAssets(version) {
  if (cache.has(version)) return cache.get(version)

  const loading = (async () => {
    const basePath = `${import.meta.env.BASE_URL}engine/${version}`
    const [renderResponse, shadersResponse, inputResponse] = await Promise.all([
      fetch(`${basePath}/az_web_render.az`),
      fetch(`${basePath}/az_shaders.az`),
      fetch(`${basePath}/az_input.az`),
    ])

    if (!renderResponse.ok || !shadersResponse.ok || !inputResponse.ok) {
      throw new Error(`Azora Engine libraries could not be loaded (${renderResponse.status}/${shadersResponse.status}/${inputResponse.status})`)
    }
    const [renderSource, shadersSource, inputSource] = await Promise.all([
      renderResponse.text(),
      shadersResponse.text(),
      inputResponse.text(),
    ])

    return Object.freeze({
      libraries: Object.freeze([
        Object.freeze({ path: 'engine/render/az_web_render.az', source: renderSource }),
        Object.freeze({ path: 'engine/shaders/az_shaders.az', source: shadersSource }),
        Object.freeze({ path: 'engine/input/az_input.az', source: inputSource }),
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
