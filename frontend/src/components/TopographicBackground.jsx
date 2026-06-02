export default function TopographicBackground({ isDark = false }) {
  const gridColor = isDark ? '#ffffff' : '#0f172a'
  const accentColor = '#ef4444'
  const baseOpacity = isDark ? 0.22 : 0.15

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: -1,
      overflow: 'hidden',
    }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <pattern id="grid-minor" width="24" height="24" patternUnits="userSpaceOnUse">
            <line x1="24" y1="0" x2="24" y2="24" stroke={gridColor} strokeWidth="0.3" opacity={baseOpacity} />
            <line x1="0" y1="24" x2="24" y2="24" stroke={gridColor} strokeWidth="0.3" opacity={baseOpacity} />
          </pattern>
          <pattern id="grid-major" width="96" height="96" patternUnits="userSpaceOnUse">
            <line x1="96" y1="0" x2="96" y2="96" stroke={gridColor} strokeWidth="0.6" opacity={baseOpacity * 1.5} />
            <line x1="0" y1="96" x2="96" y2="96" stroke={gridColor} strokeWidth="0.6" opacity={baseOpacity * 1.5} />
          </pattern>
          <pattern id="grid-accent" width="288" height="288" patternUnits="userSpaceOnUse">
            <line x1="288" y1="0" x2="288" y2="288" stroke={accentColor} strokeWidth="0.4" opacity={isDark ? 0.06 : 0.03} />
            <line x1="0" y1="288" x2="288" y2="288" stroke={accentColor} strokeWidth="0.4" opacity={isDark ? 0.06 : 0.03} />
          </pattern>
          <radialGradient id="grid-fade" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="55%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="grid-mask">
            <rect width="1440" height="900" fill="url(#grid-fade)" />
          </mask>
        </defs>

        <g mask="url(#grid-mask)">
          <rect width="1440" height="900" fill="url(#grid-minor)" />
          <rect width="1440" height="900" fill="url(#grid-major)" />
          <rect width="1440" height="900" fill="url(#grid-accent)" />
        </g>
      </svg>
    </div>
  )
}
