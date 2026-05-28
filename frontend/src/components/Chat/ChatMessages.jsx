export default function ChatMessages({ messages }) {
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      marginBottom: '15px',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '15px',
      minHeight: '300px',
    }}>
      {messages.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '50px' }}>
          Haz preguntas sobre tus datos
        </p>
      ) : (
        messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '12px',
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: msg.role === 'user' ? '#3b82f6' : '#f1f5f9',
                color: msg.role === 'user' ? 'white' : '#1a1a1a',
                fontSize: '12px',
                lineHeight: '1.4',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))
      )}
    </div>
  )
}