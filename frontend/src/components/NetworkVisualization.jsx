import React from 'react'

function NetworkVisualization({ weights, numLayers, selectedLayer }) {
  const layers = [
    { type: 'input', name: 'Input', className: 'input' },
    { type: 'conv', name: 'Conv2D', className: 'input' },
    { type: 'conv', name: 'Conv2D', className: 'input' },
    ...Array.from({ length: numLayers }, (_, i) => ({
      type: 'attention',
      name: `Attention ${i + 1}`,
      className: 'attention'
    })),
    { type: 'fc', name: 'FC', className: 'output' },
    { type: 'output', name: 'Output', className: 'output' }
  ]

  return (
    <div className="network-viz">
      <h2>Network Architecture</h2>
      <div className="layers-container">
        {layers.map((layer, idx) => (
          <React.Fragment key={idx}>
            <div 
              className={`layer-box ${layer.className} ${idx === selectedLayer || (selectedLayer > 0 && idx === selectedLayer + 2) ? 'selected' : ''}`}
            >
              <div className="layer-name">Layer {idx}</div>
              <div className="layer-type">{layer.name}</div>
            </div>
            {idx < layers.length - 1 && <span className="layer-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default NetworkVisualization
