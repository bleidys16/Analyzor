// Cuotas de uso de la IA. Un Durable Object guarda un contador diario (UTC) por clave:
//   - "ip:<dirección>"  -> tope diario por usuario
//   - "global"          -> tope diario de todo el servicio (protege la cuota gratuita de Groq)
// Los Durable Objects ejecutan las lecturas/escrituras de a una, así que el contador es exacto.

export const DEFAULT_LIMITS = { perIp: 60, global: 1500 }

export const dayOf = (now) => new Date(now).toISOString().slice(0, 10)

// Segundos hasta las 00:00 UTC, cuando se reinicia el contador
export const secondsUntilReset = (now) => {
  const next = new Date(now)
  next.setUTCHours(24, 0, 0, 0)
  return Math.max(1, Math.ceil((next.getTime() - now) / 1000))
}

// Lógica pura: dado lo guardado, el tope y el momento actual, decide si se permite una llamada más
export function applyHit(stored, limit, now) {
  const today = dayOf(now)
  const count = stored?.day === today ? stored.count : 0
  if (count >= limit) return { allowed: false, next: { day: today, count }, count, remaining: 0 }
  const next = { day: today, count: count + 1 }
  return { allowed: true, next, count: next.count, remaining: limit - next.count }
}

// Durable Object (con almacenamiento SQLite, el único disponible en el plan gratuito)
export class UsageCounter {
  constructor(state) {
    this.state = state
  }

  async fetch(request) {
    const { limit } = await request.json()
    const now = Date.now()
    const result = applyHit(await this.state.storage.get('usage'), Number(limit), now)
    if (result.allowed) await this.state.storage.put('usage', result.next)
    return Response.json({ allowed: result.allowed, remaining: result.remaining, retryAfter: secondsUntilReset(now) })
  }
}

const positiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

async function hit(env, key, limit) {
  const stub = env.USAGE.get(env.USAGE.idFromName(key))
  const res = await stub.fetch('https://usage.internal/hit', { method: 'POST', body: JSON.stringify({ limit }) })
  if (!res.ok) throw new Error(`UsageCounter respondió ${res.status}`)
  return res.json()
}

// Consume una llamada de IA. Devuelve { allowed, scope?, retryAfter? }.
// Sin binding USAGE (desarrollo o tests) no se limita. Si el contador falla, se DENIEGA:
// es preferible quedarse sin IA un rato (el chat cae a reglas) que arriesgar la cuota de Groq.
export async function consumeQuota(env, ip) {
  if (!env.USAGE) return { allowed: true }
  const perIp = positiveInt(env.DAILY_LIMIT_PER_IP, DEFAULT_LIMITS.perIp)
  const global = positiveInt(env.DAILY_LIMIT_GLOBAL, DEFAULT_LIMITS.global)
  try {
    // Primero el tope por usuario: un abusador se frena aquí y no infla el contador global
    const mine = await hit(env, `ip:${ip}`, perIp)
    if (!mine.allowed) return { allowed: false, scope: 'ip', retryAfter: mine.retryAfter }
    const all = await hit(env, 'global', global)
    if (!all.allowed) return { allowed: false, scope: 'global', retryAfter: all.retryAfter }
    return { allowed: true, remaining: mine.remaining }
  } catch (err) {
    console.error('No se pudo consultar la cuota de uso:', err?.message)
    return { allowed: false, scope: 'unavailable', retryAfter: 60 }
  }
}
