import React, { useState, useEffect } from 'react'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import HyperparameterPanel from './components/HyperparameterPanel'
import ArchitectureVisualization from './components/ArchitectureVisualization'
import MetricsSection from './components/MetricsSection'
import BackgroundDecor from './components/BackgroundDecor'
import LoginScreen from './components/LoginScreen'
import api, { saveAuth, loadAuth, clearAuth } from './utils/api'
import exp1Defaults from './data/exp1_defaults.json'
import exp2Defaults from './data/exp2_defaults.json'
import exp3Defaults from './data/exp3_defaults.json'
import exp4Defaults from './data/exp4_defaults.json'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [weights, setWeights] = useState(null)
  const [hyperparams, setHyperparams] = useState({
    dataset: 'CIFAR10',
    n_embd: 128,
    n_head: 4,
    n_layer: 6,
    epochs: 5,
    learning_rate: '3e-4',
  })
  const [activeNav, setActiveNav] = useState('vision')

  // ─── Experiment 1 state ──────────────────────────────────
  const [exp1Loading, setExp1Loading] = useState(false)
  const [exp1Metrics, setExp1Metrics] = useState(exp1Defaults)
  const [exp1Status, setExp1Status] = useState('completed')
  const [exp1Progress, setExp1Progress] = useState(null)
  const [exp1SessionId, setExp1SessionId] = useState(null)
  const exp1PollRef = React.useRef(null)
  const [exp1Hyperparams, setExp1Hyperparams] = useState({ n_embd: 128, n_head: 4, n_layer: 6, learning_rate: 0.0003, epochs: 30 })

  // ─── Experiment 2 state ──────────────────────────────────
  const [exp2Loading, setExp2Loading] = useState(false)
  const [exp2Metrics, setExp2Metrics] = useState(exp2Defaults)
  const [exp2Status, setExp2Status] = useState('completed')
  const [exp2Progress, setExp2Progress] = useState(null)
  const [exp2SessionId, setExp2SessionId] = useState(null)
  const exp2PollRef = React.useRef(null)
  const [exp2Hyperparams, setExp2Hyperparams] = useState({ n_embd: 128, n_head: 4, n_layer: 6, learning_rate: 0.001, epochs: 30 })

  // ─── Experiment 3 state ──────────────────────────────────
  const [exp3Loading, setExp3Loading] = useState(false)
  const [exp3Metrics, setExp3Metrics] = useState(exp3Defaults)
  const [exp3Status, setExp3Status] = useState('completed')
  const [exp3Progress, setExp3Progress] = useState(null)
  const [exp3SessionId, setExp3SessionId] = useState(null)
  const exp3PollRef = React.useRef(null)
  const [exp3Hyperparams, setExp3Hyperparams] = useState({ n_embd: 128, n_head: 4, n_layer: 6, learning_rate: 0.0003, epochs: 30 })

  // ─── Experiment 4 state ──────────────────────────────────
  const [exp4Loading, setExp4Loading] = useState(false)
  const [exp4Metrics, setExp4Metrics] = useState(exp4Defaults)
  const [exp4Status, setExp4Status] = useState('completed')
  const [exp4Progress, setExp4Progress] = useState(null)
  const [exp4SessionId, setExp4SessionId] = useState(null)
  const exp4PollRef = React.useRef(null)
  const [exp4Hyperparams, setExp4Hyperparams] = useState({ n_embd: 128, n_head: 4, n_layer: 6, learning_rate: 0.0003, epochs: 30 })

  // ─── Experiment 5 state ──────────────────────────────────
  const [exp5Loading, setExp5Loading] = useState(false)
  const [exp5Data, setExp5Data] = useState(null)
  const [exp5Status, setExp5Status] = useState('idle')

  // ─── Auth ────────────────────────────────────────────────
  useEffect(() => {
    const stored = loadAuth()
    if (stored) setUser(stored.user)
    setAuthChecked(true)
  }, [])

  const handleLogin = (data) => {
    const userData = { username: data.username, role: data.role }
    saveAuth(data.access_token, userData)
    setUser(userData)
  }

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    setUser(null)
  }

  // ─── Sessions ────────────────────────────────────────────
  useEffect(() => { if (user) fetchSessions() }, [user])

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions')
      setSessions(res.data.sessions || [])
      if (res.data.sessions?.length > 0 && !selectedSession) {
        const latest = res.data.sessions[0]
        if (latest.status === 'completed') selectSession(latest)
      }
    } catch (err) { console.error('Failed to fetch sessions:', err) }
  }

  const selectSession = async (session) => {
    setSelectedSession(session)
    if (session.status === 'completed') await fetchWeights(session.id)
  }

  const fetchWeights = async (sessionId) => {
    try {
      const res = await api.get(`/weights/${sessionId}`)
      setWeights(res.data.weights)
    } catch (err) { console.error('Failed to fetch weights:', err) }
  }

  // ─── Generic progress poller ─────────────────────────────
  const createPoller = (sessionId, setProgress, setMetrics, setStatus, setLoading, pollRef) => {
    const poll = setInterval(async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}/progress`)
        const data = res.data

        setProgress({
          currentEpoch: data.current_epoch,
          totalEpochs: data.total_epochs,
          trainLoss: data.train_loss,
          top1Accuracy: data.top1_accuracy,
          valError: data.val_error,
        })

        if (data.status === 'completed') {
          clearInterval(poll)
          pollRef.current = null
          const lastIdx = data.train_loss.length - 1
          setMetrics({
            trainingLoss: data.train_loss[lastIdx],
            top1Accuracy: data.top1_accuracy[lastIdx],
            valError: data.val_error[lastIdx],
          })
          setStatus('completed')
          setLoading(false)
          await fetchSessions()
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(poll)
          pollRef.current = null
          setLoading(false)
          setStatus(data.status)
        }
      } catch (err) { console.error('Polling error:', err) }
    }, 1500)
    pollRef.current = poll
  }

  // ─── Generic cancel handler ──────────────────────────────
  const createCanceller = (sessionId, pollRef, setLoading, setStatus) => async () => {
    if (!sessionId) return
    try {
      await api.post(`/sessions/${sessionId}/cancel`)
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      setLoading(false)
      setStatus('cancelled')
    } catch (err) { console.error('Failed to cancel:', err) }
  }

  // ─── Experiment 1 handlers ───────────────────────────────
  const handleTrainExp1 = async () => {
    setExp1Loading(true)
    setExp1Status('training')
    setExp1Metrics(null)
    setExp1Progress(null)
    setExp1Hyperparams({
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      n_layer: hyperparams.n_layer,
      learning_rate: parseFloat(hyperparams.learning_rate),
      epochs: hyperparams.epochs,
    })

    const config = {
      dataset: hyperparams.dataset.toLowerCase(),
      num_layers: hyperparams.n_layer,
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      epochs: hyperparams.epochs,
      batch_size: 128,
      learning_rate: parseFloat(hyperparams.learning_rate),
    }

    try {
      const res = await api.post('/train', config)
      setExp1SessionId(res.data.session_id)

      // Exp1-specific poller: handles 4-plot data (loss, acc, SR/layer, SR/steps)
      const poll = setInterval(async () => {
        try {
          const r = await api.get(`/sessions/${res.data.session_id}/progress`)
          const d = r.data

          setExp1Progress({
            currentEpoch: d.current_epoch,
            totalEpochs: d.total_epochs,
            trainLoss: d.train_loss,
            valLoss: d.val_loss,
            trainAcc: d.train_acc,
            valAcc: d.top1_accuracy,
            srPerLayer: d.sr_per_layer,
            srOverall: d.sr_overall,
            srSteps: d.sr_steps,
          })

          if (d.status === 'completed') {
            clearInterval(poll)
            exp1PollRef.current = null
            const last = d.train_loss.length - 1
            setExp1Metrics({
              trainLoss: d.train_loss,
              valLoss: d.val_loss,
              trainAcc: d.train_acc,
              valAcc: d.top1_accuracy,
              srPerLayer: d.sr_per_layer,
              srOverall: d.sr_overall,
              srSteps: d.sr_steps,
            })
            setExp1Status('completed')
            setExp1Loading(false)
            await fetchSessions()
          } else if (d.status === 'failed' || d.status === 'cancelled') {
            clearInterval(poll)
            exp1PollRef.current = null
            setExp1Loading(false)
            setExp1Status(d.status)
          }
        } catch (err) { console.error('Exp1 polling error:', err) }
      }, 1500)
      exp1PollRef.current = poll
    } catch (err) {
      console.error('Exp1 training failed:', err)
      setExp1Loading(false)
      setExp1Status('failed')
    }
  }

  const handleCancelExp1 = createCanceller(exp1SessionId, exp1PollRef, setExp1Loading, setExp1Status)

  // ─── Experiment 2 handlers ───────────────────────────────
  const handleTrainExp2 = async () => {
    setExp2Loading(true)
    setExp2Status('training')
    setExp2Metrics(null)
    setExp2Progress(null)
    setExp2Hyperparams({
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      n_layer: hyperparams.n_layer,
      learning_rate: parseFloat(hyperparams.learning_rate),
      epochs: hyperparams.epochs,
    })

    const config = {
      num_layers: hyperparams.n_layer,
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      epochs: hyperparams.epochs,
      batch_size: 128,
      learning_rate: parseFloat(hyperparams.learning_rate),
    }

    try {
      const res = await api.post('/train/exp2', config)
      setExp2SessionId(res.data.session_id)

      // Exp2-specific poller: handles 4-plot data
      const poll = setInterval(async () => {
        try {
          const r = await api.get(`/sessions/${res.data.session_id}/progress`)
          const d = r.data

          setExp2Progress({
            currentEpoch: d.current_epoch,
            totalEpochs: d.total_epochs,
            trainLoss: d.train_loss,
            valLoss: d.val_loss,
            trainAcc: d.train_acc,
            valAcc: d.top1_accuracy,
            srPerLayer: d.sr_per_layer,
            srOverall: d.sr_overall,
            srSteps: d.sr_steps,
          })

          if (d.status === 'completed') {
            clearInterval(poll)
            exp2PollRef.current = null
            setExp2Metrics({
              trainLoss: d.train_loss,
              valLoss: d.val_loss,
              trainAcc: d.train_acc,
              valAcc: d.top1_accuracy,
              srPerLayer: d.sr_per_layer,
              srOverall: d.sr_overall,
              srSteps: d.sr_steps,
            })
            setExp2Status('completed')
            setExp2Loading(false)
            await fetchSessions()
          } else if (d.status === 'failed' || d.status === 'cancelled') {
            clearInterval(poll)
            exp2PollRef.current = null
            setExp2Loading(false)
            setExp2Status(d.status)
          }
        } catch (err) { console.error('Exp2 polling error:', err) }
      }, 1500)
      exp2PollRef.current = poll
    } catch (err) {
      console.error('Exp2 training failed:', err)
      setExp2Loading(false)
      setExp2Status('failed')
    }
  }

  const handleCancelExp2 = createCanceller(exp2SessionId, exp2PollRef, setExp2Loading, setExp2Status)

  // ─── Experiment 3 handlers ───────────────────────────────
  const handleTrainExp3 = async () => {
    setExp3Loading(true)
    setExp3Status('training')
    setExp3Metrics(null)
    setExp3Progress(null)
    setExp3Hyperparams({
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      n_layer: hyperparams.n_layer,
      learning_rate: parseFloat(hyperparams.learning_rate),
      epochs: hyperparams.epochs,
    })

    const config = {
      num_layers: hyperparams.n_layer,
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      epochs: hyperparams.epochs,
      batch_size: 128,
      learning_rate: parseFloat(hyperparams.learning_rate),
    }

    try {
      const res = await api.post('/train/exp3', config)
      setExp3SessionId(res.data.session_id)

      // Exp3-specific poller: handles 4-plot data
      const poll = setInterval(async () => {
        try {
          const r = await api.get(`/sessions/${res.data.session_id}/progress`)
          const d = r.data

          setExp3Progress({
            currentEpoch: d.current_epoch,
            totalEpochs: d.total_epochs,
            trainLoss: d.train_loss,
            valLoss: d.val_loss,
            trainAcc: d.train_acc,
            valAcc: d.top1_accuracy,
            srPerLayer: d.sr_per_layer,
            srOverall: d.sr_overall,
            srSteps: d.sr_steps,
          })

          if (d.status === 'completed') {
            clearInterval(poll)
            exp3PollRef.current = null
            setExp3Metrics({
              trainLoss: d.train_loss,
              valLoss: d.val_loss,
              trainAcc: d.train_acc,
              valAcc: d.top1_accuracy,
              srPerLayer: d.sr_per_layer,
              srOverall: d.sr_overall,
              srSteps: d.sr_steps,
            })
            setExp3Status('completed')
            setExp3Loading(false)
            await fetchSessions()
          } else if (d.status === 'failed' || d.status === 'cancelled') {
            clearInterval(poll)
            exp3PollRef.current = null
            setExp3Loading(false)
            setExp3Status(d.status)
          }
        } catch (err) { console.error('Exp3 polling error:', err) }
      }, 1500)
      exp3PollRef.current = poll
    } catch (err) {
      console.error('Exp3 training failed:', err)
      setExp3Loading(false)
      setExp3Status('failed')
    }
  }

  const handleCancelExp3 = createCanceller(exp3SessionId, exp3PollRef, setExp3Loading, setExp3Status)

  // ─── Experiment 4 handlers ───────────────────────────────
  const handleTrainExp4 = async () => {
    setExp4Loading(true)
    setExp4Status('training')
    setExp4Metrics(null)
    setExp4Progress(null)
    setExp4Hyperparams({
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      n_layer: hyperparams.n_layer,
      learning_rate: parseFloat(hyperparams.learning_rate),
      epochs: hyperparams.epochs,
    })

    const config = {
      num_layers: hyperparams.n_layer,
      n_embd: hyperparams.n_embd,
      n_head: hyperparams.n_head,
      epochs: hyperparams.epochs,
      batch_size: 128,
      learning_rate: parseFloat(hyperparams.learning_rate),
    }

    try {
      const res = await api.post('/train/exp4', config)
      setExp4SessionId(res.data.session_id)

      // Exp4-specific poller: handles 4-plot data
      const poll = setInterval(async () => {
        try {
          const r = await api.get(`/sessions/${res.data.session_id}/progress`)
          const d = r.data

          setExp4Progress({
            currentEpoch: d.current_epoch,
            totalEpochs: d.total_epochs,
            trainLoss: d.train_loss,
            valLoss: d.val_loss,
            trainAcc: d.train_acc,
            valAcc: d.top1_accuracy,
            srPerLayer: d.sr_per_layer,
            srOverall: d.sr_overall,
            srSteps: d.sr_steps,
          })

          if (d.status === 'completed') {
            clearInterval(poll)
            exp4PollRef.current = null
            setExp4Metrics({
              trainLoss: d.train_loss,
              valLoss: d.val_loss,
              trainAcc: d.train_acc,
              valAcc: d.top1_accuracy,
              srPerLayer: d.sr_per_layer,
              srOverall: d.sr_overall,
              srSteps: d.sr_steps,
            })
            setExp4Status('completed')
            setExp4Loading(false)
            await fetchSessions()
          } else if (d.status === 'failed' || d.status === 'cancelled') {
            clearInterval(poll)
            exp4PollRef.current = null
            setExp4Loading(false)
            setExp4Status(d.status)
          }
        } catch (err) { console.error('Exp4 polling error:', err) }
      }, 1500)
      exp4PollRef.current = poll
    } catch (err) {
      console.error('Exp4 training failed:', err)
      setExp4Loading(false)
      setExp4Status('failed')
    }
  }

  const handleCancelExp4 = createCanceller(exp4SessionId, exp4PollRef, setExp4Loading, setExp4Status)

  // ─── Experiment 5 handler ────────────────────────────────
  const handleRunExp5 = async () => {
    setExp5Loading(true)
    setExp5Status('training')
    setExp5Data(null)
    try {
      const res = await api.get('/exp5/data')
      // Simulate progressive load with short delay
      await new Promise(r => setTimeout(r, 800))
      setExp5Data(res.data)
      setExp5Status('completed')
    } catch (err) {
      console.error('Exp5 data fetch failed:', err)
      setExp5Status('failed')
    } finally {
      setExp5Loading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────
  if (!authChecked) return null

  if (!user) {
    return (
      <div className="bg-surface-dim selection:bg-primary/30 min-h-screen">
        <LoginScreen onLogin={handleLogin} />
      </div>
    )
  }

  return (
    <div className="bg-surface-dim selection:bg-primary/30 min-h-screen">
      <TopNav user={user} onLogout={handleLogout} />
      <SideNav activeNav={activeNav} setActiveNav={setActiveNav} user={user} />
      <main className="md:pl-64 pt-20 pb-12 px-6">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-on-surface uppercase tracking-tight mb-2">
            Vision Transformer <span className="text-primary neon-glow">Training</span>
          </h1>
          <p className="text-on-surface-variant font-body max-w-2xl">
            High-precision attention-based architecture optimization for distributed visual feature synthesis.
          </p>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <HyperparameterPanel
            hyperparams={hyperparams}
            setHyperparams={setHyperparams}
            loading={exp1Loading || exp2Loading || exp3Loading || exp4Loading}
          />
          <ArchitectureVisualization hyperparams={hyperparams} />
          <MetricsSection
            exp1Metrics={exp1Metrics}
            exp1Loading={exp1Loading}
            exp1Status={exp1Status}
            exp1Progress={exp1Progress}
            onTrainExp1={handleTrainExp1}
            onCancelExp1={handleCancelExp1}
            exp1Hyperparams={exp1Hyperparams}
            exp2Metrics={exp2Metrics}
            exp2Loading={exp2Loading}
            exp2Status={exp2Status}
            exp2Progress={exp2Progress}
            onTrainExp2={handleTrainExp2}
            onCancelExp2={handleCancelExp2}
            exp2Hyperparams={exp2Hyperparams}
            exp3Metrics={exp3Metrics}
            exp3Loading={exp3Loading}
            exp3Status={exp3Status}
            exp3Progress={exp3Progress}
            onTrainExp3={handleTrainExp3}
            onCancelExp3={handleCancelExp3}
            exp3Hyperparams={exp3Hyperparams}
            exp4Metrics={exp4Metrics}
            exp4Loading={exp4Loading}
            exp4Status={exp4Status}
            exp4Progress={exp4Progress}
            onTrainExp4={handleTrainExp4}
            onCancelExp4={handleCancelExp4}
            exp4Hyperparams={exp4Hyperparams}
            exp5Data={exp5Data}
            exp5Loading={exp5Loading}
            exp5Status={exp5Status}
            onRunExp5={handleRunExp5}
          />
        </div>
      </main>
      <BackgroundDecor />
    </div>
  )
}

export default App
