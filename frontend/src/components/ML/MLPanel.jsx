import { useState, useEffect } from 'react'
import { modelsAPI } from '../../api/models'

export default function MLPanel({ datasetId, columns }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [targetColumn, setTargetColumn] = useState(columns?.[0] || '')
  const [modelType, setModelType] = useState('random_forest')

  useEffect(() => {
    loadModels()
  }, [datasetId])

  const loadModels = async () => {
    try {
      const response = await modelsAPI.getAll(datasetId)
      setModels(response.data)
    } catch (err) {
      console.error('Error cargando modelos:', err)
    }
  }

  const handleTrain = async () => {
    if (!targetColumn) return
    
    setLoading(true)
    try {
      await modelsAPI.train(datasetId, targetColumn, modelType)
      await loadModels()
    } catch (err) {
      console.error('Error entrenando:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      marginTop: '20px',
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700 }}>
        🤖 Machine Learning
      </h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          value={targetColumn}
          onChange={(e) => setTargetColumn(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          {columns?.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>

        <select
          value={modelType}
          onChange={(e) => setModelType(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <option value="random_forest">Random Forest</option>
          <option value="linear_regression">Regresión Lineal</option>
          <option value="knn">KNN</option>
          <option value="logistic_regression">Regresión Logística</option>
        </select>

        <button
          onClick={handleTrain}
          disabled={loading || !targetColumn}
          style={{
            padding: '8px 16px',
            background: loading ? '#cbd5e1' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {loading ? 'Entrenando...' : 'Entrenar'}
        </button>
      </div>

      {models.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>
            Modelos Entrenados
          </h3>
          {models.map((model) => (
            <div key={model.id} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '8px',
              fontSize: '12px',
            }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                {model.name}
              </p>
              {model.accuracy !== null && (
                <p style={{ margin: '0 0 2px 0', color: '#64748b' }}>
                  Accuracy: {(model.accuracy * 100).toFixed(2)}%
                </p>
              )}
              {model.mae !== null && (
                <p style={{ margin: '0 0 2px 0', color: '#64748b' }}>
                  MAE: {model.mae.toFixed(4)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}