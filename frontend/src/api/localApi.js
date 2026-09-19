// Adaptador: mantiene la forma de axios ({ data } y err.response.data.error) para que la UI no cambie.
import { NotFoundError, UploadError } from '../engine/datasetService'
import { MissingFileError } from '../engine/session'

const statusFor = (err) => {
  if (err instanceof NotFoundError) return 404
  if (err instanceof UploadError) return 400
  if (err instanceof MissingFileError) return 410
  return 500
}

export async function call(fn) {
  try {
    return { data: await fn() }
  } catch (err) {
    const status = statusFor(err)
    if (status === 500) console.error(err)
    const message = err?.message || 'Error inesperado'
    throw Object.assign(new Error(message), { response: { status, data: { error: message, detail: message } } })
  }
}
