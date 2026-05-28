import { useState } from 'react'

export default function ChatInput({ onSend, datasetId }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return
    
    setSending(true)
    await onSend(input)
    setInput('')
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        placeholder="Pregunta..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        disabled={sending}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid var(--card-border)',
          background: 'var(--card-bg)',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: '"Space Grotesk", sans-serif',
          color: 'var(--text-main)',
          outline: 'none',
        }}
      />
      <button
        onClick={handleSend}
        disabled={sending}
        style={{
          padding: '8px 12px',
          background: sending ? 'var(--card-border)' : 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: sending ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {sending ? '...' : '→'}
      </button>
    </div>
  )
}