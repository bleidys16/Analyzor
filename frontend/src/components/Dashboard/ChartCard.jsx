export default function ChartCard({ title, subtitle, children, height = 'auto' }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      height,
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 700,
          color: '#0f172a',
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: '#64748b',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
