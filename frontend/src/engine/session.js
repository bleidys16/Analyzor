// Una sola instancia de DuckDB con un dataset cargado a la vez (tabla `data`).
// Todas las operaciones pasan por una cola para que no se pisen al cambiar de dataset.
import { loadCsv } from './csv'
import { datasetStore } from './store'

export class MissingFileError extends Error {}

let runnerFactory = async () => {
  const { createBrowserRunner } = await import('./runner.browser')
  return createBrowserRunner()
}
let runnerPromise = null
let loadedId = null
let queue = Promise.resolve()

// Solo para tests: inyecta otro runner (p. ej. DuckDB de Node)
export function setRunnerFactory(factory) {
  runnerFactory = factory
  runnerPromise = null
  loadedId = null
  queue = Promise.resolve()
}

const getRunner = () => {
  runnerPromise ||= runnerFactory().catch((err) => {
    runnerPromise = null
    throw err
  })
  return runnerPromise
}

const enqueue = (task) => {
  const run = queue.then(task)
  queue = run.catch(() => {})
  return run
}

// Ejecuta fn(runner) con el dataset `id` cargado desde IndexedDB
export function runOnDataset(id, fn) {
  return enqueue(async () => {
    const runner = await getRunner()
    if (loadedId !== id) {
      loadedId = null
      const bytes = await datasetStore.getFile(id)
      if (!bytes) throw new MissingFileError('El archivo de este dataset ya no está disponible. Súbelo de nuevo.')
      await loadCsv(runner, bytes)
      loadedId = id
    }
    return fn(runner)
  })
}

// Carga bytes recién subidos (aún sin guardar) y ejecuta fn(runner, { schema, rowsCount })
export function runOnNewFile(id, bytes, fn) {
  return enqueue(async () => {
    const runner = await getRunner()
    loadedId = null
    const info = await loadCsv(runner, bytes)
    loadedId = id
    try {
      return await fn(runner, info)
    } catch (err) {
      loadedId = null
      throw err
    }
  })
}

export function forget(id) {
  if (loadedId === id) loadedId = null
}
