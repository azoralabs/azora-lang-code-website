export const VERSIONS = [
  { id: '0.0.1-alpha.2', label: '0.0.1-alpha.2', isDefault: true },
]

export function getDefaultVersion() {
  return VERSIONS.find(v => v.isDefault)?.id || VERSIONS[0].id
}

export function isValidVersion(id) {
  return VERSIONS.some(v => v.id === id)
}
