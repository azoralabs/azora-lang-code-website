export const VERSIONS = [
  { id: '0.1.0-dev', label: '0.1.0-dev', isDefault: true },
]

export function getDefaultVersion() {
  return VERSIONS.find(v => v.isDefault)?.id || VERSIONS[0].id
}

export function isValidVersion(id) {
  return VERSIONS.some(v => v.id === id)
}
