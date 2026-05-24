import { useState, useEffect } from 'react'
import { datasetsAPI } from '../api/datasets'
import DatasetUpload from '../components/Datasets/DatasetUpload'

export default function DatasetsPage() {
    const [datasets, setDatasets] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDatasets()
    }, [])

    const fetchDatasets = async () => {
        try {
            const response = await datasetsAPI.getAll()
            setDatasets(response.data)
        } catch (error) {
            console.error('Error fetching datasets:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <h1>Mis Datasets</h1>

            <DatasetUpload />

            <h2 style={{ marginTop: '40px' }}>Datasets Cargados</h2>

            {loading ? (
                <p>Cargando...</p>
            ) : datasets.length === 0 ? (
                <p>No tienes datasets aún. Sube uno arriba.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {datasets.map((dataset) => (
                        <div key={dataset.id} style={{
                            background: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '20px',
                        }}>
                            <h3>{dataset.name}</h3>
                            <p>Filas: {dataset.rows_count}</p>
                            <p>Columnas: {dataset.columns.length}</p>
                            <p style={{ fontSize: '12px', color: '#999' }}>
                                {new Date(dataset.created_at).toLocaleDateString()}
                            </p>
                            <button style={{
                                padding: '8px 16px',
                                background: '#1976d2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                            }}>
                                Analizar
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}