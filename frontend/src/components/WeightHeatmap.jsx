import React, { useMemo, useState } from 'react'

function WeightHeatmap({ weights, layerIndex, numLayers }) {
  const [hoveredCell, setHoveredCell] = useState(null)
  
  const layerWeights = useMemo(() => {
    if (!weights) return []
    
    const keys = Object.keys(weights).filter(k => {
      if (layerIndex === 0) {
        return k.includes('conv') || k.includes('bn') || k.includes('fc')
      }
      return k.includes(`attention_layers.${layerIndex - 1}`)
    })
    
    return keys.slice(0, 5)
  }, [weights, layerIndex])
  
  const getWeightMatrix = (weightKey) => {
    const w = weights[weightKey]
    if (!w) return []
    
    const flat = Array.isArray(w) ? w.flat() : w.flat ? w.flatten() : []
    const size = Math.min(Math.ceil(Math.sqrt(flat.length)), 32)
    
    const matrix = []
    for (let i = 0; i < size; i++) {
      matrix.push(flat.slice(i * size, (i + 1) * size))
    }
    return matrix
  }
  
  const getColor = (value) => {
    const abs = Math.abs(value)
    const intensity = Math.min(abs * 2, 1)
    
    if (value > 0) {
      return `rgba(34, 197, 94, ${intensity})`
    } else {
      return `rgba(239, 68, 68, ${intensity})`
    }
  }
  
  const getStats = (weightKey) => {
    const w = weights[weightKey]
    if (!w) return { min: 0, max: 0, mean: 0 }
    
    const flat = Array.isArray(w) ? w.flat() : []
    return {
      min: Math.min(...flat).toFixed(4),
      max: Math.max(...flat).toFixed(4),
      mean: (flat.reduce((a, b) => a + b, 0) / flat.length).toFixed(4)
    }
  }
  
  const layerName = layerIndex === 0 ? 'Input/CNN Layers' : `Attention Block ${layerIndex}`
  
  return (
    <div className="heatmap">
      <h2>Weight Visualization: {layerName}</h2>
      
      {layerWeights.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No weights available for this layer</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {layerWeights.map((weightKey) => {
            const matrix = getWeightMatrix(weightKey)
            const stats = getStats(weightKey)
            
            return (
              <div key={weightKey} style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                  {weightKey}
                </h4>
                
                {matrix.length > 0 && (
                  <div 
                    className="heatmap-grid"
                    style={{ 
                      gridTemplateColumns: `repeat(${matrix[0].length}, 1fr)`,
                      marginBottom: '0.75rem'
                    }}
                  >
                    {matrix.flat().slice(0, 256).map((value, idx) => (
                      <div
                        key={idx}
                        className="heatmap-cell"
                        style={{ background: getColor(value) }}
                        onMouseEnter={(e) => setHoveredCell({ x: e.clientX, y: e.clientY, value })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    ))}
                  </div>
                )}
                
                <div className="weight-stats">
                  <div className="stat"><span>Min:</span> <span>{stats.min}</span></div>
                  <div className="stat"><span>Max:</span> <span>{stats.max}</span></div>
                  <div className="stat"><span>Mean:</span> <span>{stats.mean}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {hoveredCell && (
        <div 
          className="heatmap-tooltip"
          style={{ 
            left: hoveredCell.x + 10, 
            top: hoveredCell.y + 10,
            position: 'fixed'
          }}
        >
          Value: {hoveredCell.value?.toFixed(4)}
        </div>
      )}
    </div>
  )
}

export default WeightHeatmap
