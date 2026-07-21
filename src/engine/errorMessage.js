export function errorMessage(error, fallback = 'Unknown error') {
  if (typeof error === 'string') return error
  if (error == null) return fallback

  try {
    const message = error.message
    if (typeof message === 'string' && message.length > 0) return message
    if (typeof message === 'number' || typeof message === 'boolean') return `${message}`
  } catch {}

  try {
    const serialized = JSON.stringify(error)
    if (typeof serialized === 'string' && serialized !== '{}') return serialized
  } catch {}

  return fallback
}
