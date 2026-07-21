import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const packageMetadata = JSON.parse(
  await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'),
)
const version = process.argv[2] || packageMetadata.version
const stdlibRoot = path.resolve(repositoryRoot, '../azora-lang/std')
const engineRoot = path.resolve(repositoryRoot, '../azora-engine/engine')
const outputFile = path.resolve(
  repositoryRoot,
  process.argv[3] || `public/azls/${version}/stdlib.json`,
)

async function collectAzoraFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectAzoraFiles(absolutePath)
    return entry.isFile() && entry.name.endsWith('.az') ? [absolutePath] : []
  }))
  return nested.flat()
}

const files = (await collectAzoraFiles(stdlibRoot)).sort((left, right) =>
  left.localeCompare(right),
)

const stdlibDocuments = await Promise.all(files.map(async (absolutePath) => {
  const relativePath = path.relative(stdlibRoot, absolutePath).split(path.sep).join('/')
  return {
    uri: `azora-stdlib:///std/${relativePath}`,
    path: `std/${relativePath}`,
    source: await readFile(absolutePath, 'utf8'),
  }
}))

const engineFiles = [
  path.join(engineRoot, 'render/az_web_render.az'),
  path.join(engineRoot, 'shaders/az_shaders.az'),
]
const engineDocuments = await Promise.all(engineFiles.map(async (absolutePath) => {
  const relativePath = path.relative(engineRoot, absolutePath).split(path.sep).join('/')
  return {
    uri: `azora-engine:///engine/render/${relativePath}`,
    path: `engine/render/${relativePath}`,
    source: await readFile(absolutePath, 'utf8'),
  }
}))
const documents = [...stdlibDocuments, ...engineDocuments]

await mkdir(path.dirname(outputFile), { recursive: true })
await writeFile(outputFile, `${JSON.stringify({ version, documents })}\n`)
console.log(`Bundled ${stdlibDocuments.length} stdlib and ${engineDocuments.length} engine documents for ${version}.`)
