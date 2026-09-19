import { describe, expect, it, vi } from 'vitest'
import { applyHit, consumeQuota, dayOf, secondsUntilReset } from './usage.js'
import { fakeNamespace } from './testing.js'

const NOON = Date.UTC(2026, 8, 19, 12, 0, 0)
const NEXT_DAY = Date.UTC(2026, 8, 20, 0, 0, 1)

describe('applyHit (lógica pura)', () => {
  it('cuenta hasta el tope y luego deniega sin seguir sumando', () => {
    let stored
    for (let i = 1; i <= 3; i++) {
      const r = applyHit(stored, 3, NOON)
      expect(r).toMatchObject({ allowed: true, count: i, remaining: 3 - i })
      stored = r.next
    }
    const denied = applyHit(stored, 3, NOON)
    expect(denied).toMatchObject({ allowed: false, remaining: 0 })
    expect(denied.next.count).toBe(3)
  })

  it('el contador se reinicia al cambiar el día UTC', () => {
    const full = { day: dayOf(NOON), count: 3 }
    expect(applyHit(full, 3, NOON).allowed).toBe(false)
    expect(applyHit(full, 3, NEXT_DAY)).toMatchObject({ allowed: true, count: 1 })
  })

  it('calcula cuánto falta para el reinicio', () => {
    expect(secondsUntilReset(NOON)).toBe(12 * 3600)
    expect(secondsUntilReset(Date.UTC(2026, 8, 19, 23, 59, 59))).toBe(1)
  })
})

describe('UsageCounter (Durable Object)', () => {
  it('responde allowed/remaining y persiste el conteo', async () => {
    const ns = fakeNamespace()
    const stub = ns.get('ip:1.1.1.1')
    const call = async () => (await stub.fetch('https://x/hit', { method: 'POST', body: JSON.stringify({ limit: 2 }) })).json()
    expect(await call()).toMatchObject({ allowed: true, remaining: 1 })
    expect(await call()).toMatchObject({ allowed: true, remaining: 0 })
    const third = await call()
    expect(third.allowed).toBe(false)
    expect(third.retryAfter).toBeGreaterThan(0)
    expect(ns.storages.get('ip:1.1.1.1').get('usage').count).toBe(2)
  })
})

describe('consumeQuota', () => {
  it('sin binding USAGE no limita (desarrollo y tests)', async () => {
    expect(await consumeQuota({}, '1.1.1.1')).toEqual({ allowed: true })
  })

  it('limita por IP y no afecta a otras IPs', async () => {
    const env = { USAGE: fakeNamespace(), DAILY_LIMIT_PER_IP: '2', DAILY_LIMIT_GLOBAL: '100' }
    expect((await consumeQuota(env, 'A')).allowed).toBe(true)
    expect((await consumeQuota(env, 'A')).allowed).toBe(true)
    expect(await consumeQuota(env, 'A')).toMatchObject({ allowed: false, scope: 'ip' })
    expect((await consumeQuota(env, 'B')).allowed).toBe(true)
  })

  it('el tope global corta a todos, y un usuario bloqueado NO infla el contador global', async () => {
    const env = { USAGE: fakeNamespace(), DAILY_LIMIT_PER_IP: '2', DAILY_LIMIT_GLOBAL: '3' }
    await consumeQuota(env, 'A')
    await consumeQuota(env, 'A')
    for (let i = 0; i < 5; i++) await consumeQuota(env, 'A') // bloqueado por IP: no suma al global
    expect(env.USAGE.storages.get('global').get('usage').count).toBe(2)

    expect((await consumeQuota(env, 'B')).allowed).toBe(true) // global = 3
    expect(await consumeQuota(env, 'C')).toMatchObject({ allowed: false, scope: 'global' })
  })

  it('valores de configuración inválidos usan los predeterminados', async () => {
    const env = { USAGE: fakeNamespace(), DAILY_LIMIT_PER_IP: 'abc', DAILY_LIMIT_GLOBAL: '-5' }
    const result = await consumeQuota(env, 'A')
    expect(result).toMatchObject({ allowed: true, remaining: 59 })
  })

  it('si el contador falla, DENIEGA (protege la cuota de Groq)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = { USAGE: { idFromName: (n) => n, get: () => ({ fetch: async () => { throw new Error('DO caído') } }) } }
    expect(await consumeQuota(env, 'A')).toMatchObject({ allowed: false, scope: 'unavailable' })
    errors.mockRestore()
  })
})
