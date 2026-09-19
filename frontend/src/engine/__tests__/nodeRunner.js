// Runner de DuckDB para Node (solo tests): misma interfaz que el runner del navegador.
import { Buffer } from 'node:buffer'
import { DuckDBInstance } from '@duckdb/node-api'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function createNodeRunner() {
  const instance = await DuckDBInstance.create(':memory:')
  const connection = await instance.connect()
  const dir = await mkdtemp(join(tmpdir(), 'analyzor-test-'))
  const paths = new Map()

  const resolve = (sql) => {
    let out = sql
    for (const [name, path] of paths) out = out.split(`'${name}'`).join(`'${path.replace(/\\/g, '/')}'`)
    return out
  }

  return {
    async query(sql) {
      const reader = await connection.runAndReadAll(resolve(sql))
      return { columns: reader.columnNames(), rows: reader.getRowObjects() }
    },
    async registerFile(name, bytes) {
      const path = join(dir, name)
      await writeFile(path, bytes)
      paths.set(name, path)
    },
    async dropFile(name) {
      paths.delete(name)
    },
    async close() {
      connection.closeSync()
      await rm(dir, { recursive: true, force: true })
    },
  }
}

export const csvBytes = (text, encoding = 'utf-8') =>
  encoding === 'latin1' ? Uint8Array.from(Buffer.from(text, 'latin1')) : new TextEncoder().encode(text)
