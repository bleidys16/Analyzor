// Si el mismo archivo se subió varias veces el mismo día, la lista muestra solo el más reciente
export function latestPerDay(datasets) {
  const seen = new Map()
  for (const ds of datasets || []) {
    const key = `${ds.name}_${ds.created_at?.slice(0, 10) || ''}`
    if (!seen.has(key) || new Date(ds.created_at) > new Date(seen.get(key).created_at)) {
      seen.set(key, ds)
    }
  }
  return Array.from(seen.values())
}
