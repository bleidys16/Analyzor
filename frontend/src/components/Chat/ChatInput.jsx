import { useState, useRef, useEffect } from 'react'

export default function ChatInput({ onSend, sending = false, columns = [] }) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [atIndex, setAtIndex] = useState(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  // Filtrado de columnas según lo escrito después de '@'
  const matchingColumns = (columns || []).filter((col) =>
    col.toLowerCase().includes(filterText.toLowerCase())
  )

  const handleSend = () => {
    if (!input.trim() || sending) return
    onSend(input)
    setInput('')
    setShowMenu(false)
    setAtIndex(-1)
    setFilterText('')
    inputRef.current?.focus()
  }

  // Detecta si el usuario está escribiendo una mención con '@'
  const checkMention = (text, cursor) => {
    const leftText = text.slice(0, cursor)
    const match = leftText.match(/(?:^|\s)@([^\s@]*)$/)
    if (match) {
      const query = match[1]
      const atPos = cursor - query.length - 1
      setAtIndex(atPos)
      setFilterText(query)
      setSelectedIndex(0)
      setShowMenu(true)
    } else {
      setShowMenu(false)
      setAtIndex(-1)
      setFilterText('')
    }
  }

  const handleChange = (e) => {
    const nextVal = e.target.value
    const cursor = e.target.selectionStart ?? nextVal.length
    setInput(nextVal)
    checkMention(nextVal, cursor)
  }

  const handleSelectColumn = (col) => {
    if (atIndex < 0) return
    const formatted = col.includes(' ') ? `"${col}" ` : `${col} `
    const before = input.slice(0, atIndex)
    const after = input.slice(atIndex + 1 + filterText.length)
    const nextVal = before + formatted + after
    setInput(nextVal)
    setShowMenu(false)
    setAtIndex(-1)
    setFilterText('')

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const newCursor = before.length + formatted.length
        inputRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 10)
  }

  const handleKeyDown = (e) => {
    if (showMenu && matchingColumns.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % matchingColumns.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + matchingColumns.length) % matchingColumns.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        handleSelectColumn(matchingColumns[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMenu(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Cerrar menú flotante si se hace clic afuera
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      gap: '8px',
      paddingTop: '12px',
      borderTop: '1px solid var(--card-border)',
      flexShrink: 0,
    }}>
      {/* Menú flotante de autocompletado de columnas */}
      {showMenu && matchingColumns.length > 0 && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: '320px',
            maxWidth: 'min(320px, calc(100vw - 32px))',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            zIndex: 100,
            animation: 'fadeInMenu 0.15s ease',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            borderBottom: '1px solid var(--card-border)',
            background: 'var(--code-bg)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}>
            <span>Columnas ({matchingColumns.length})</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>↑↓ navegar • Enter para elegir</span>
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
            {matchingColumns.map((col, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={col}
                  onClick={() => handleSelectColumn(col)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--code-bg)' : 'transparent',
                    border: isSelected ? '1px solid var(--card-border)' : '1px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: isSelected ? 'var(--accent-strong)' : 'var(--card-border)',
                    color: isSelected ? 'white' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    @
                  </span>
                  <span style={{
                    fontSize: '12.5px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: isSelected ? 600 : 400,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--code-bg)',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--card-border)'}`,
        borderRadius: '12px',
        padding: '4px 4px 4px 14px',
        transition: 'border-color 0.2s ease',
        boxShadow: focused ? '0 0 0 3px rgba(225, 29, 72, 0.12)' : 'none',
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Escribe tu pregunta o escribe @ para columnas..."
          aria-label="Escribe tu pregunta sobre el dataset"
          value={input}
          onChange={handleChange}
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
            fontFamily: '"Geist", sans-serif',
            color: 'var(--text-main)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          aria-label="Enviar pregunta"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            background: input.trim() && !sending ? 'var(--accent-strong)' : 'var(--card-border)',
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
            <div aria-hidden="true" style={{
              width: '14px',
              height: '14px',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'chat-spin 0.6s linear infinite',
            }} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        @keyframes fadeInMenu {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
