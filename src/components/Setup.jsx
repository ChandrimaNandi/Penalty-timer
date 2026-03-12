import { useState } from 'react'

function Setup({ onComplete }) {
  const [step, setStep] = useState('count') // 'count' | 'names' | 'time'
  const [count, setCount] = useState('')
  const [names, setNames] = useState([])
  const [globalMinutes, setGlobalMinutes] = useState('5')
  const [globalSeconds, setGlobalSeconds] = useState('0')
  const [error, setError] = useState('')

  function handleCountSubmit(e) {
    e.preventDefault()
    const n = parseInt(count, 10)
    if (!n || n < 1 || n > 100) {
      setError('Please enter a number between 1 and 100.')
      return
    }
    setError('')
    setNames(Array.from({ length: n }, (_, i) => `Team ${i + 1}`))
    setStep('names')
  }

  function handleNameChange(i, value) {
    setNames((prev) => {
      const updated = [...prev]
      updated[i] = value
      return updated
    })
  }

  function handleNamesSubmit(e) {
    e.preventDefault()
    const trimmed = names.map((n) => n.trim())
    if (trimmed.some((n) => !n)) {
      setError('All team names must be filled in.')
      return
    }
    const unique = new Set(trimmed)
    if (unique.size !== trimmed.length) {
      setError('Team names must be unique.')
      return
    }
    setError('')
    setNames(trimmed)
    setStep('time')
  }

  function handleTimeSubmit(e) {
    e.preventDefault()
    const mins = parseInt(globalMinutes, 10) || 0
    const secs = parseInt(globalSeconds, 10) || 0
    const total = mins * 60 + secs
    if (total <= 0) {
      setError('Please set a time greater than 0.')
      return
    }
    setError('')
    const teams = names.map((name, i) => ({
      id: i,
      name,
      seconds: total,
    }))
    onComplete(teams)
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <span className="setup-icon">⏱</span>
          <h1>Penalty Timer</h1>
          <p className="setup-subtitle">Group countdown manager</p>
        </div>

        {step === 'count' && (
          <form onSubmit={handleCountSubmit} className="setup-form">
            <h2>How many teams?</h2>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="e.g. 4"
              className="setup-input"
              autoFocus
            />
            {error && <p className="setup-error">{error}</p>}
            <button type="submit" className="btn-primary">
              Next
            </button>
          </form>
        )}

        {step === 'names' && (
          <form onSubmit={handleNamesSubmit} className="setup-form">
            <h2>Enter team names</h2>
            <div className="names-grid">
              {names.map((name, i) => (
                <div key={i} className="name-row">
                  <span className="name-index">{i + 1}</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    className="setup-input"
                    maxLength={30}
                  />
                </div>
              ))}
            </div>
            {error && <p className="setup-error">{error}</p>}
            <div className="btn-row">
              <button type="button" className="btn-secondary" onClick={() => { setError(''); setStep('count') }}>
                Back
              </button>
              <button type="submit" className="btn-primary">
                Next
              </button>
            </div>
          </form>
        )}

        {step === 'time' && (
          <form onSubmit={handleTimeSubmit} className="setup-form">
            <h2>Set starting time for all teams</h2>
            <div className="time-inputs">
              <div className="time-field">
                <label>Minutes</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={globalMinutes}
                  onChange={(e) => setGlobalMinutes(e.target.value)}
                  className="setup-input time-input"
                />
              </div>
              <span className="time-colon">:</span>
              <div className="time-field">
                <label>Seconds</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={globalSeconds}
                  onChange={(e) => setGlobalSeconds(e.target.value)}
                  className="setup-input time-input"
                />
              </div>
            </div>
            {error && <p className="setup-error">{error}</p>}
            <div className="btn-row">
              <button type="button" className="btn-secondary" onClick={() => { setError(''); setStep('names') }}>
                Back
              </button>
              <button type="submit" className="btn-primary">
                Start Timers
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Setup
