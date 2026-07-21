
export const VERSIONS = [
  { id: '0.0.4', label: '0.0.4', isDefault: true },
]

export function getDefaultVersion() {
  return VERSIONS.find(v => v.isDefault)?.id || VERSIONS[0].id
}

export function isValidVersion(id) {
  return VERSIONS.some(v => v.id === id)
}
