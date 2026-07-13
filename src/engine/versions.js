
export const VERSIONS = [
  { id: '0.0.3', label: '0.0.3', isDefault: true },
  { id: '0.0.1-alpha.3', label: '0.0.1-alpha.3' },
  { id: '0.0.1-alpha.2', label: '0.0.1-alpha.2' },
]

export function getDefaultVersion() {
  return VERSIONS.find(v => v.isDefault)?.id || VERSIONS[0].id
}

export function isValidVersion(id) {
  return VERSIONS.some(v => v.id === id)
}
