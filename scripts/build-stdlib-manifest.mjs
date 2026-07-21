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

const documents = await Promise.all(files.map(async (absolutePath) => {
  const relativePath = path.relative(stdlibRoot, absolutePath).split(path.sep).join('/')
  return {
    uri: `azora-stdlib:///std/${relativePath}`,
    path: `std/${relativePath}`,
    source: await readFile(absolutePath, 'utf8'),
  }
}))

await mkdir(path.dirname(outputFile), { recursive: true })
await writeFile(outputFile, `${JSON.stringify({ version, documents })}\n`)
console.log(`Bundled ${documents.length} Azora stdlib documents for ${version}.`)
