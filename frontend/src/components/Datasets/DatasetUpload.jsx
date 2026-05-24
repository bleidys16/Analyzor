import { useState } from 'react'
import { datasetsAPI } from '../../api/datasets'

export default function DatasetUpload() {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    const handleChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile)
            setError(null)
        } else {
            setError('Por favor selecciona un archivo CSV')
            setFile(null)
        }
    }

    const handleUpload = async () => {
        if (!file) {
            setError('Selecciona un archivo primero')
            return
        }

        setUploading(true)
        setError(null)
        setSuccess(null)

        try {
            const response = await datasetsAPI.upload(file)
            setSuccess(`Dataset "${response.data.name}" cargado exitosamente`)
            setFile(null)
            // Aquí podrías recargar la lista de datasets
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al subir el archivo')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{
            background: 'white',
            border: '2px dashed #ccc',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
        }}>
            <h2>Subir Dataset CSV</h2>

            <input
                type="file"
                accept=".csv"
                onChange={handleChange}
                style={{ marginBottom: '15px' }}
            />

            {file && (
                <p style={{ color: '#666', marginBottom: '15px' }}>
                    Archivo seleccionado: {file.name}
                </p>
            )}

            {error && <p style={{ color: '#d32f2f', marginBottom: '15px' }}>{error}</p>}
            {success && <p style={{ color: '#388e3c', marginBottom: '15px' }}>{success}</p>}

            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                style={{
                    padding: '12px 24px',
                    background: file ? '#1976d2' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: file ? 'pointer' : 'not-allowed',
                }}
            >
                {uploading ? 'Subiendo...' : 'Subir Dataset'}
            </button>
        </div>
    )
}