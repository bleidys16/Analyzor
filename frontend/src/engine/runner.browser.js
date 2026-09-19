// Runner de DuckDB-WASM para el navegador. Interfaz común de los runners:
//   query(sql) -> { columns, rows }   registerFile(name, bytes)   dropFile(name)
// Los binarios .wasm pesan ~35 MB (más que el límite de 25 MiB por archivo de Cloudflare Pages),
// por eso se cargan desde el CDN de jsDelivr, con la misma versión que el paquete instalado.
import * as duckdb from '@duckdb/duckdb-wasm'

export async function createBrowserRunner() {
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles())
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  )
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl))
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(workerUrl)
  const connection = await db.connect()

  return {
    async query(sql) {
      const table = await connection.query(sql)
      return {
        columns: table.schema.fields.map((f) => f.name),
        rows: table.toArray().map((row) => row.toJSON()),
      }
    },
    // registerFileBuffer transfiere el ArrayBuffer (lo deja inutilizable): se pasa una copia
    async registerFile(name, bytes) {
      await db.registerFileBuffer(name, bytes.slice())
    },
    async dropFile(name) {
      await db.dropFile(name)
    },
  }
}
