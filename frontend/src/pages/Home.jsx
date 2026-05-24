import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <div>
            <h1>Bienvenido a ANALYZOR</h1>
            <p>Carga archivos CSV, analiza datos con SQL y entrena modelos de ML automáticamente.</p>

            <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <Link to="/datasets" style={{
                    padding: '20px',
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#1976d2',
                    fontWeight: 600,
                    textAlign: 'center',
                }}>
                    📊 Subir Dataset
                </Link>
                <Link to="/editor" style={{
                    padding: '20px',
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#1976d2',
                    fontWeight: 600,
                    textAlign: 'center',
                }}>
                    🔍 Editor SQL
                </Link>
                <Link to="/ml" style={{
                    padding: '20px',
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#1976d2',
                    fontWeight: 600,
                    textAlign: 'center',
                }}>
                    🤖 Entrenar Modelo
                </Link>
            </div>
        </div>
    )
}