import { useState, useEffect, useRef, useCallback } from 'react'
import TeamTimer from './TeamTimer.jsx'

function TimerBoard({ initialTeams, onReset }) {
  const [teams, setTeams] = useState(() =>
    initialTeams.map((t) => ({ ...t, running: false, finished: false }))
  )
  const [selectedIds, setSelectedIds] = useState([])
  const [deductMins, setDeductMins] = useState('1')
  const [deductSecs, setDeductSecs] = useState('0')
  const [globalMins, setGlobalMins] = useState('5')
  const [globalSecs, setGlobalSecs] = useState('0')
  const intervalRef = useRef(null)
  const audioContextRef = useRef(null)
  const alertedTeamsRef = useRef(new Set())

  const initializeAudio = useCallback(() => {
    if (typeof window === 'undefined') return null

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    return audioContextRef.current
  }, [])

  const playAlarm = useCallback(() => {
    const context = initializeAudio()
    if (!context) return

    const startAt = context.currentTime
    const tones = [740, 880, 1046, 880, 740, 1046]

    tones.forEach((frequency, index) => {
      const toneStart = startAt + index * 0.2
      const toneEnd = toneStart + 0.28

      const mainOscillator = context.createOscillator()
      const supportOscillator = context.createOscillator()
      const gainNode = context.createGain()

      mainOscillator.type = 'square'
      mainOscillator.frequency.setValueAtTime(frequency, toneStart)

      supportOscillator.type = 'triangle'
      supportOscillator.frequency.setValueAtTime(frequency * 1.5, toneStart)

      gainNode.gain.setValueAtTime(0.0001, toneStart)
      gainNode.gain.exponentialRampToValueAtTime(0.3, toneStart + 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.18, toneStart + 0.12)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd)

      mainOscillator.connect(gainNode)
      supportOscillator.connect(gainNode)
      gainNode.connect(context.destination)

      mainOscillator.start(toneStart)
      supportOscillator.start(toneStart)
      mainOscillator.stop(toneEnd)
      supportOscillator.stop(toneEnd)
    })
  }, [initializeAudio])

  // Master tick: runs every second, decrements running timers
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTeams((prev) =>
        prev.map((t) => {
          if (!t.running || t.finished) return t
          const next = t.seconds - 1
          if (next <= 0) return { ...t, seconds: 0, running: false, finished: true }
          return { ...t, seconds: next }
        })
      )
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    const newlyFinished = teams.filter(
      (team) => team.finished && !alertedTeamsRef.current.has(team.id)
    )

    if (newlyFinished.length > 0) {
      newlyFinished.forEach((team) => alertedTeamsRef.current.add(team.id))
      playAlarm()
    }

    teams.forEach((team) => {
      if (!team.finished && alertedTeamsRef.current.has(team.id)) {
        alertedTeamsRef.current.delete(team.id)
      }
    })
  }, [teams, playAlarm])

  const toggleTimer = useCallback((id) => {
    initializeAudio()
    setTeams((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, running: t.finished ? false : !t.running } : t
      )
    )
  }, [initializeAudio])

  function startAll() {
    initializeAudio()
    setTeams((prev) => prev.map((t) => ({ ...t, running: t.finished ? false : true })))
  }

  function pauseAll() {
    initializeAudio()
    setTeams((prev) => prev.map((t) => ({ ...t, running: false })))
  }

  function resetAll() {
    initializeAudio()
    const newTime = parseInt(globalMins, 10) * 60 + parseInt(globalSecs, 10)
    if (newTime > 0) {
      setTeams((prev) =>
        prev.map((t) => ({ ...t, seconds: newTime, running: false, finished: false }))
      )
    }
  }

  function toggleSelectedTeam(id) {
    initializeAudio()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    )
  }

  function clearSelection() {
    initializeAudio()
    setSelectedIds([])
  }

  function handleDeduct() {
    initializeAudio()
    if (selectedIds.length === 0) return
    const secs = (parseInt(deductMins, 10) || 0) * 60 + (parseInt(deductSecs, 10) || 0)
    if (secs <= 0) return
    setTeams((prev) =>
      prev.map((t) => {
        if (!selectedIds.includes(t.id)) return t
        const next = Math.max(0, t.seconds - secs)
        return { ...t, seconds: next, finished: next === 0, running: next === 0 ? false : t.running }
      })
    )
    setSelectedIds([])
  }

  function handleAddTime() {
    initializeAudio()
    if (selectedIds.length === 0) return
    const secs = (parseInt(deductMins, 10) || 0) * 60 + (parseInt(deductSecs, 10) || 0)
    if (secs <= 0) return
    setTeams((prev) =>
      prev.map((t) => {
        if (!selectedIds.includes(t.id)) return t
        return { ...t, seconds: t.seconds + secs, finished: false }
      })
    )
    setSelectedIds([])
  }

  const allRunning = teams.every((t) => t.running || t.finished)
  const allPaused = teams.every((t) => !t.running)
  const selectedTeams = teams.filter((t) => selectedIds.includes(t.id))

  return (
    <div className="board-container">
      {/* Top bar */}
      <div className="board-topbar">
        <span className="board-title">⏱ Penalty Timer</span>
        <div className="topbar-controls">
          <button className="btn-icon-danger" onClick={onReset} title="New session">
            New
          </button>
        </div>
      </div>

      {/* Global controls */}
      <div className="global-controls">
        <div className="global-btns">
          <button className="btn-green" onClick={startAll} disabled={allRunning}>
            Start All
          </button>
          <button className="btn-yellow" onClick={pauseAll} disabled={allPaused}>
            Pause All
          </button>
        </div>

        <div className="reset-group">
          <label className="control-label">Reset all to:</label>
          <input
            type="number"
            min={0}
            value={globalMins}
            onChange={(e) => setGlobalMins(e.target.value)}
            className="small-input"
          />
          <span className="sep">m</span>
          <input
            type="number"
            min={0}
            max={59}
            value={globalSecs}
            onChange={(e) => setGlobalSecs(e.target.value)}
            className="small-input"
          />
          <span className="sep">s</span>
          <button className="btn-outline" onClick={resetAll}>
            Reset All
          </button>
        </div>
      </div>

      {/* Penalty / add time panel */}
      <div className="penalty-panel">
        <div className="penalty-left">
          <label className="control-label">Penalty targets:</label>
          <div className="selection-summary">
            {selectedIds.length === 0
              ? 'Click team cards to select one or more teams.'
              : `${selectedIds.length} team${selectedIds.length > 1 ? 's' : ''} selected`}
          </div>
          <button className="btn-outline" onClick={clearSelection} disabled={selectedIds.length === 0}>
            Clear Selection
          </button>
        </div>

        <div className="penalty-time">
          <input
            type="number"
            min={0}
            value={deductMins}
            onChange={(e) => setDeductMins(e.target.value)}
            className="small-input"
          />
          <span className="sep">m</span>
          <input
            type="number"
            min={0}
            max={59}
            value={deductSecs}
            onChange={(e) => setDeductSecs(e.target.value)}
            className="small-input"
          />
          <span className="sep">s</span>
        </div>

        <div className="penalty-btns">
          <button
            className="btn-red"
            onClick={handleDeduct}
            disabled={selectedIds.length === 0}
            title="Deduct time from selected teams"
          >
            Deduct Time
          </button>
          <button
            className="btn-green"
            onClick={handleAddTime}
            disabled={selectedIds.length === 0}
            title="Add time to selected teams"
          >
            Add Time
          </button>
        </div>

        {selectedTeams.length > 0 && (
          <div className="selected-badge">
            {selectedTeams.map((team) => (
              <span key={team.id} className="selected-chip">
                <span style={{ color: team.finished ? '#ef4444' : '#22c55e' }}>●</span>
                {team.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Timer grid */}
      <div className="timer-grid">
        {teams.map((team) => (
          <TeamTimer
            key={team.id}
            team={team}
            isSelected={selectedIds.includes(team.id)}
            onSelect={() => toggleSelectedTeam(team.id)}
            onToggle={() => toggleTimer(team.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default TimerBoard
