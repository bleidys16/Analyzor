import { useState, useRef } from 'react'

export default function ChatInput({ onSend, datasetId }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)

  const handleSend = async () => {
    if (!input.trim() || sending) return

    setSending(true)
    await onSend(input)
    setInput('')
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      paddingTop: '12px',
      borderTop: '1px solid var(--card-border)',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--code-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '10px',
        padding: '4px 4px 4px 14px',
        transition: 'border-color 0.2s ease',
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Pregunta sobre tus datos..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            padding: '8px 0',
            fontSize: '13px',
            fontFamily: '"Space Grotesk", sans-serif',
            color: 'var(--text-main)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            background: input.trim() && !sending ? 'var(--accent)' : 'var(--card-border)',
            color: input.trim() && !sending ? 'white' : 'var(--text-muted)',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          {sending ? (
            <div style={{
              width: '14px',
              height: '14px',
              border: '2px solid white',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'chat-spin 0.6s linear infinite',
            }} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      <style>{`
        @keyframes chat-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
