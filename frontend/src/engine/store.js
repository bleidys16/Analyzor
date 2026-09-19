// Persistencia local (IndexedDB): datasets, archivos CSV y mensajes del chat.
// Es la única capa que sabe dónde viven los datos; para pasar a la nube (Supabase) basta
// con otra implementación de esta misma interfaz.
import { openDB } from 'idb'

const DB_NAME = 'analyzor'
const DB_VERSION = 1

let dbPromise = null

const getDb = () => {
  dbPromise ||= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('datasets', { keyPath: 'id' })
      db.createObjectStore('files')
      const messages = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true })
      messages.createIndex('by_dataset', 'dataset_id')
    },
  })
  return dbPromise
}

// Solo para tests: descarta la conexión cacheada
export const resetStoreConnection = async () => {
  if (dbPromise) (await dbPromise).close()
  dbPromise = null
}

export const datasetStore = {
  async list() {
    const all = await (await getDb()).getAll('datasets')
    return all.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  },

  async get(id) {
    return (await getDb()).get('datasets', id)
  },

  async getFile(id) {
    return (await getDb()).get('files', id)
  },

  // Guarda metadatos y (opcionalmente) el archivo en una sola transacción
  async put(meta, bytes = null) {
    const db = await getDb()
    const tx = db.transaction(['datasets', 'files'], 'readwrite')
    tx.objectStore('datasets').put(meta)
    if (bytes) tx.objectStore('files').put(bytes, meta.id)
    await tx.done
    return meta
  },

  async remove(id) {
    const db = await getDb()
    const tx = db.transaction(['datasets', 'files', 'messages'], 'readwrite')
    tx.objectStore('datasets').delete(id)
    tx.objectStore('files').delete(id)
    const messages = tx.objectStore('messages')
    for (const key of await messages.index('by_dataset').getAllKeys(id)) messages.delete(key)
    await tx.done
  },

  async listMessages(datasetId) {
    const db = await getDb()
    const all = await db.getAllFromIndex('messages', 'by_dataset', datasetId)
    return all.sort((a, b) => a.id - b.id)
  },

  async addMessage(message) {
    const id = await (await getDb()).add('messages', message)
    return { ...message, id }
  },

  async clearMessages(datasetId) {
    const db = await getDb()
    const tx = db.transaction('messages', 'readwrite')
    for (const key of await tx.store.index('by_dataset').getAllKeys(datasetId)) tx.store.delete(key)
    await tx.done
  },
}

// Pide al navegador que no borre los datos al liberar espacio (mejor esfuerzo)
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist()
  } catch {
    // no crítico
  }
}
