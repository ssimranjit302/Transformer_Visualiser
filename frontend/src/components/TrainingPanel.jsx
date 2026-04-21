import React, { useState } from 'react'

function TrainingPanel({ onTrain, loading, sessions, selectedSession, onSelectSession }) {
  const [dataset, setDataset] = useState('cifar10')
  const [numLayers, setNumLayers] = useState(3)
  const [epochs, setEpochs] = useState(5)
  const [batchSize, setBatchSize] = useState(32)
  const [learningRate, setLearningRate] = useState(0.001)

  const handleSubmit = (e) => {
    e.preventDefault()
    onTrain({ dataset, num_layers: numLayers, epochs, batch_size: batchSize, learning_rate: learningRate })
  }

  return (
    <div className="training-panel">
      <h2>Train Network</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Dataset</label>
          <select value={dataset} onChange={(e) => setDataset(e.target.value)} disabled={loading}>
            <option value="cifar10">CIFAR-10</option>
            <option value="mnist">MNIST</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Number of Attention Layers (1-10)</label>
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={numLayers} 
            onChange={(e) => setNumLayers(Number(e.target.value))}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Epochs</label>
          <input 
            type="number" 
            min="1" 
            max="100" 
            value={epochs} 
            onChange={(e) => setEpochs(Number(e.target.value))}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Batch Size</label>
          <input 
            type="number" 
            min="8" 
            max="128" 
            value={batchSize} 
            onChange={(e) => setBatchSize(Number(e.target.value))}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Learning Rate</label>
          <input 
            type="number" 
            step="0.0001" 
            min="0.0001" 
            max="0.1" 
            value={learningRate} 
            onChange={(e) => setLearningRate(Number(e.target.value))}
            disabled={loading}
          />
        </div>
        
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Training...' : 'Start Training'}
        </button>
      </form>
      
      <div className="sessions-list">
        <h3>Previous Sessions</h3>
        {sessions.slice(0, 5).map((session) => (
          <div 
            key={session.id} 
            className={`session-item ${selectedSession?.id === session.id ? 'active' : ''}`}
            onClick={() => onSelectSession(session)}
          >
            <div className="session-header">
              <span className="dataset">{session.dataset.toUpperCase()}</span>
              <span className={`status ${session.status}`}>{session.status}</span>
            </div>
            <div className="meta">
              {session.num_layers} layers • {session.epochs} epochs
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TrainingPanel
