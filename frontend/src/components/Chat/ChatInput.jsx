import { useState, useRef } from 'react'

export default function ChatInput({ onSend, sending = false }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const handleSend = () => {
    if (!input.trim() || sending) return
    onSend(input)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const [focused, setFocused] = useState(false)

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      paddingTop: '12px',
      borderTop: '1px solid var(--card-border)',
      flexShrink: 0,
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--code-bg)',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--card-border)'}`,
        borderRadius: '12px',
        padding: '4px 4px 4px 14px',
        transition: 'border-color 0.2s ease',
        boxShadow: focused ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Escribe tu pregunta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={sending}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            padding: '10px 0',
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
            width: '36px',
            height: '36px',
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
