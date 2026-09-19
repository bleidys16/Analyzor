// Genera public/ejemplo_ventas.csv: ventas de una tienda en 2025 (500 filas), con datos reproducibles.
//   node scripts/generate-sample-data.mjs
import { writeFileSync } from 'node:fs'

// PRNG con semilla fija para que el CSV sea idéntico en cada ejecución
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(2025)

const weighted = (entries) => {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [value, w] of entries) {
    r -= w
    if (r <= 0) return value
  }
  return entries[entries.length - 1][0]
}

const CITIES = [['Bogotá', 32], ['Medellín', 24], ['Cali', 18], ['Barranquilla', 14], ['Bucaramanga', 12]]
const CATALOG = {
  Electrónica: { weight: 30, maxQty: 3, products: [['Audífonos inalámbricos', 59], ['Smartwatch', 129], ['Tablet 10"', 249], ['Cámara de seguridad', 79], ['Parlante Bluetooth', 45]] },
  Hogar: { weight: 28, maxQty: 5, products: [['Juego de sábanas', 39], ['Licuadora', 55], ['Lámpara de mesa', 29], ['Set de ollas', 89], ['Aspiradora', 149]] },
  Moda: { weight: 24, maxQty: 4, products: [['Chaqueta', 79], ['Tenis casuales', 65], ['Jeans', 49], ['Camiseta básica', 15], ['Bolso', 59]] },
  Deportes: { weight: 18, maxQty: 4, products: [['Balón de fútbol', 25], ['Mancuernas 10 kg', 45], ['Tapete de yoga', 22], ['Bicicleta estática', 299], ['Botella térmica', 19]] },
}
const MONTH_WEIGHT = [0.8, 0.8, 0.9, 0.95, 1, 1, 1.05, 1, 1, 1.1, 1.6, 1.9] // más ventas en noviembre y diciembre
const DISCOUNTS = [[0, 55], [0.05, 15], [0.1, 15], [0.15, 10], [0.2, 5]]

const pad = (n) => String(n).padStart(2, '0')
const daysInMonth = (month) => new Date(2025, month + 1, 0).getDate()

const rows = []
for (let i = 0; i < 500; i++) {
  const month = weighted(MONTH_WEIGHT.map((w, m) => [m, w]))
  const day = 1 + Math.floor(rand() * daysInMonth(month))
  const category = weighted(Object.entries(CATALOG).map(([name, c]) => [name, c.weight]))
  const { products, maxQty } = CATALOG[category]
  const [product, basePrice] = products[Math.floor(rand() * products.length)]
  const channel = weighted([['Online', 55], ['Tienda', 45]])
  const satisfactionBase = channel === 'Online' ? 4.3 : 3.9
  const satisfaction = Math.max(1, Math.min(5, Math.round(satisfactionBase + (rand() + rand() + rand() - 1.5))))
  rows.push({
    fecha: `2025-${pad(month + 1)}-${pad(day)}`,
    ciudad: weighted(CITIES),
    categoria: category,
    producto: product,
    canal: channel,
    cantidad: 1 + Math.floor(rand() * maxQty),
    precio_unitario: (basePrice * (0.9 + rand() * 0.2)).toFixed(2),
    descuento: weighted(DISCOUNTS),
    satisfaccion: rand() < 0.07 ? '' : satisfaction, // ~7% sin calificar
    cliente_id: 1000 + Math.floor(rand() * 180),
  })
}
rows.sort((a, b) => a.fecha.localeCompare(b.fecha))

const columns = Object.keys(rows[0])
const csv = [columns.join(','), ...rows.map((r) => columns.map((c) => r[c]).join(','))].join('\n') + '\n'
writeFileSync(new URL('../public/ejemplo_ventas.csv', import.meta.url), csv)
console.log(`ejemplo_ventas.csv: ${rows.length} filas, ${columns.length} columnas`)
