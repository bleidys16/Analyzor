import { useEffect, useRef, useState } from 'react'
import ChartRenderer from './ChartRenderer'
import { parseInline, parseMessage } from '../../utils/messageFormat'

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--text-muted)',
          animation: 'typing-bounce 1.4s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const QueryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
)

const PromptIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// Pinta un texto con **negritas** y `código en línea` como elementos de React (nunca HTML crudo)
function InlineText({ text }) {
  return parseInline(text).map((part, i) => {
    if (part.type === 'bold') return <strong key={i}>{part.text}</strong>
    if (part.type === 'code') {
      return (
        <code key={i} style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '1px 5px', fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
          {part.text}
        </code>
      )
    }
    return part.text
  })
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.warn('No se pudo copiar:', err)
    }
  }

  return (
    <div style={{ margin: '8px 0', border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--code-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px', borderBottom: '1px solid var(--card-border)', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>{lang || 'código'}</span>
        <button onClick={copy} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '10px 12px', overflowX: 'auto', fontSize: '12px', lineHeight: 1.5, whiteSpace: 'pre', color: 'var(--text-main)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// Un mensaje del chat: texto con formato ligero y bloques de código
function MessageContent({ text }) {
  return parseMessage(text).map((segment, i) =>
    segment.type === 'code'
      ? <CodeBlock key={i} lang={segment.lang} code={segment.code} />
      : <span key={i} style={{ display: 'block' }}><InlineText text={segment.text} /></span>
  )
}

const SUGGESTIONS = [
  'Muéstrame los primeros datos',
  '¿Cuáles son los valores máximos y mínimos?',
  '¿Cómo se distribuyen los datos?',
  'Muéstrame un resumen general',
  '¿Hay alguna correlación entre columnas?',
]

function formatCell(val) {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'number') {
    return new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(val)
  }
  return String(val)
}

function QueryResultView({ queryResult, hasChart = false }) {
  const [copiedType, setCopiedType] = useState(null)
  const { data = [], columns = [] } = queryResult || {}

  if (!data || data.length === 0) return null

  const cols = columns.length > 0 ? columns : Object.keys(data[0] || {})
  const previewRows = data.slice(0, 5)

  const copyAsTsv = async () => {
    try {
      const headerLine = cols.join('\t')
      const rowLines = data.map((row) => cols.map((c) => {
        const v = row[c]
        if (v === null || v === undefined) return ''
        return String(v).replace(/[\t\n\r]/g, ' ')
      }).join('\t'))
      const text = [headerLine, ...rowLines].join('\n')
      await navigator.clipboard.writeText(text)
      setCopiedType('tsv')
      setTimeout(() => setCopiedType(null), 2000)
    } catch (err) {
      console.warn('Error al copiar TSV:', err)
    }
  }

  const copyAsCsv = async () => {
    try {
      const escapeCell = (v) => {
        if (v === null || v === undefined) return ''
        const s = String(v)
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`
        }
        return s
      }
      const headerLine = cols.map(escapeCell).join(',')
      const rowLines = data.map((row) => cols.map((c) => escapeCell(row[c])).join(','))
      const text = [headerLine, ...rowLines].join('\n')
      await navigator.clipboard.writeText(text)
      setCopiedType('csv')
      setTimeout(() => setCopiedType(null), 2000)
    } catch (err) {
      console.warn('Error al copiar CSV:', err)
    }
  }

  return (
    <div style={{ marginTop: '10px' }}>
      {!hasChart && (
        <div style={{
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'var(--code-bg)',
          marginBottom: '8px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 10px',
            borderBottom: '1px solid var(--card-border)',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            <span style={{ fontWeight: 600 }}>Vista de datos ({data.length} filas)</span>
            <span>{data.length > 5 ? 'Mostrando primeras 5' : `${data.length} registros`}</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '160px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', fontFamily: '"Geist", sans-serif' }}>
              <thead>
                <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)' }}>
                  {cols.map((col, i) => (
                    <th key={i} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIdx) => (
                  <tr key={rowIdx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {cols.map((col, colIdx) => (
                      <td key={colIdx} style={{ padding: '5px 8px', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <button
          onClick={copyAsTsv}
          title="Copiar tabla en formato TSV listo para pegar en Excel o Google Sheets"
          aria-label="Copiar para Excel"
          style={{
            background: copiedType === 'tsv' ? 'var(--accent-strong)' : 'var(--code-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            color: copiedType === 'tsv' ? 'white' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '3px 8px',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {copiedType === 'tsv' ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
          {copiedType === 'tsv' ? '¡Copiado para Excel!' : 'Copiar para Excel'}
        </button>

        <button
          onClick={copyAsCsv}
          title="Copiar datos filtrados como CSV"
          aria-label="Copiar como CSV"
          style={{
            background: copiedType === 'csv' ? 'var(--accent-strong)' : 'none',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            color: copiedType === 'csv' ? 'white' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '3px 8px',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {copiedType === 'csv' ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </>
            )}
          </svg>
          {copiedType === 'csv' ? '¡CSV copiado!' : 'Copiar CSV'}
        </button>
      </div>
    </div>
  )
}

export default function ChatMessages({ messages = [], sending = false, onSend, onRegenerate, onClearChat, suggestions = SUGGESTIONS }) {
  const validMessages = (messages || []).filter(msg => msg && msg.role)
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [messages, sending])

  if (validMessages.length === 0 && !sending) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        gap: '20px',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          background: 'var(--code-bg)',
          border: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-main)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '15px', margin: '0 0 4px 0', fontWeight: 600 }}>
            Consultas en lenguaje natural
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
            Escribe una pregunta sobre tus datos o selecciona una consulta rápida:
          </p>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          maxWidth: '400px',
        }}>
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSend?.(suggestion)}
              style={{
                padding: '8px 14px',
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Geist", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-strong)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'var(--accent-strong)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--code-bg)'
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--card-border)'
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {onClearChat && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '8px',
          marginBottom: '10px',
          borderBottom: '1px solid var(--card-border)',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Consultas realizadas ({validMessages.length})
          </span>
          <button
            onClick={onClearChat}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontFamily: '"Geist", sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-text)'
              e.currentTarget.style.background = 'var(--code-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'none'
            }}
            title="Borrar conversación"
            aria-label="Borrar conversación"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Borrar conversación
          </button>
        </div>
      )}

      <div ref={ref} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        flex: 1,
        overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {validMessages.map((msg, idx) => {
          const sql = msg.sql_generated || msg.query_result?.sql
          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: '8px',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: msg.role === 'user' ? 'var(--accent-strong)' : 'var(--code-bg)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
              }}>
                {msg.role === 'user' ? <PromptIcon /> : <QueryIcon />}
              </div>
              <div style={{ maxWidth: '80%', minWidth: 0 }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: msg.role === 'user' ? 'var(--accent-strong)' : 'var(--card-bg)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
                  boxShadow: msg.role === 'user' ? '0 2px 8px rgba(225, 29, 72, 0.15)' : 'none',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                }}>
                  <MessageContent text={msg.content} />
                </div>
                {msg.role === 'assistant' && sql && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      userSelect: 'none',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      Ver consulta SQL
                    </summary>
                    <CodeBlock lang="sql" code={sql} />
                  </details>
                )}
                {msg.role === 'assistant' && msg.query_result?.chart && (
                  <ChartRenderer chartConfig={msg.query_result.chart} />
                )}
                {msg.role === 'assistant' && msg.query_result?.data && msg.query_result.data.length > 0 && (
                  <QueryResultView
                    queryResult={msg.query_result}
                    hasChart={Boolean(msg.query_result.chart && msg.query_result.chart.type !== 'text')}
                  />
                )}
                {msg.role === 'assistant' && onRegenerate && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                    <button
                      onClick={() => onRegenerate(idx)}
                      disabled={sending}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        cursor: sending ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: '"Geist", sans-serif',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!sending) {
                          e.currentTarget.style.color = 'var(--text-main)'
                          e.currentTarget.style.background = 'var(--code-bg)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)'
                        e.currentTarget.style.background = 'none'
                      }}
                      title="Regenerar respuesta"
                      aria-label="Regenerar respuesta"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M23 4v6h-6" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      Regenerar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '36px' }}>
            <TypingDots />
          </div>
        )}
      </div>
    </div>
  )
}
