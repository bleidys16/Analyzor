// Ayudantes solo para tests (no lo importa el Worker, así que no se incluye en el despliegue).
import { UsageCounter } from './usage.js'

// Namespace de Durable Objects simulado: una instancia de UsageCounter por nombre
export function fakeNamespace() {
  const storages = new Map()
  const objects = new Map()
  return {
    idFromName: (name) => name,
    get(name) {
      if (!objects.has(name)) {
        const data = new Map()
        storages.set(name, data)
        const state = { storage: { get: async (k) => data.get(k), put: async (k, v) => void data.set(k, v) } }
        objects.set(name, new UsageCounter(state))
      }
      return { fetch: (url, init) => objects.get(name).fetch(new Request(url, init)) }
    },
    storages,
  }
}
