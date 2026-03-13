import { useState, useEffect, useRef, useCallback } from 'react'
import TeamTimer from './TeamTimer.jsx'

function TimerBoard({ initialTeams, onReset }) {
  const mainInitialSeconds = initialTeams[0]?.seconds ?? 300
  const [mainSeconds, setMainSeconds] = useState(mainInitialSeconds)
  const [mainRunning, setMainRunning] = useState(false)
  const [mainFinished, setMainFinished] = useState(false)
  const [mainRounds, setMainRounds] = useState(0)
  const [teams, setTeams] = useState(() =>
    initialTeams.map((t) => ({
      ...t,
      penaltySeconds: 60,
      penaltyFinished: false,
      completedThisCycle: false,
    }))
  )
  const [selectedIds, setSelectedIds] = useState([])
  const [activePenaltyIds, setActivePenaltyIds] = useState([])
  const [globalMins, setGlobalMins] = useState(String(Math.floor(mainInitialSeconds / 60)))
  const [globalSecs, setGlobalSecs] = useState(String(mainInitialSeconds % 60))
  const intervalRef = useRef(null)
  const audioContextRef = useRef(null)
  const cycleStartedRef = useRef(false)
  const mainAlarmFiredRef = useRef(false)

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

  const playMainAlarm = useCallback(() => {
    const context = initializeAudio()
    if (!context) return

    const startAt = context.currentTime
    const hornBursts = [0, 0.42, 0.84]

    hornBursts.forEach((offset) => {
      const toneStart = startAt + offset
      const toneEnd = toneStart + 0.32

      const primaryOscillator = context.createOscillator()
      const supportOscillator = context.createOscillator()
      const gainNode = context.createGain()

      primaryOscillator.type = 'sawtooth'
      primaryOscillator.frequency.setValueAtTime(1320, toneStart)
      primaryOscillator.frequency.linearRampToValueAtTime(1180, toneEnd)

      supportOscillator.type = 'square'
      supportOscillator.frequency.setValueAtTime(880, toneStart)
      supportOscillator.frequency.linearRampToValueAtTime(760, toneEnd)

      gainNode.gain.setValueAtTime(0.0001, toneStart)
      gainNode.gain.exponentialRampToValueAtTime(0.38, toneStart + 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.22, toneStart + 0.16)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd)

      primaryOscillator.connect(gainNode)
      supportOscillator.connect(gainNode)
      gainNode.connect(context.destination)

      primaryOscillator.start(toneStart)
      supportOscillator.start(toneStart)
      primaryOscillator.stop(toneEnd)
      supportOscillator.stop(toneEnd)
    })
  }, [initializeAudio])

  const playPenaltyAlarm = useCallback(() => {
    const context = initializeAudio()
    if (!context) return

    const startAt = context.currentTime
    const beeps = [0, 0.18, 0.36]

    beeps.forEach((offset) => {
      const toneStart = startAt + offset
      const toneEnd = toneStart + 0.12

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(988, toneStart)

      gainNode.gain.setValueAtTime(0.0001, toneStart)
      gainNode.gain.exponentialRampToValueAtTime(0.2, toneStart + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd)

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      oscillator.start(toneStart)
      oscillator.stop(toneEnd)
    })
  }, [initializeAudio])

  // Master tick: runs every second, decrements main timer and selected team penalties
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const completedPenaltyIds = []

      setMainSeconds((prev) => {
        if (!mainRunning || mainFinished) return prev
        const next = prev - 1
        if (next <= 0) {
          if (!mainAlarmFiredRef.current) {
            mainAlarmFiredRef.current = true
            playMainAlarm()
          }
          setMainRunning(false)
          setMainFinished(true)
          return 0
        }
        return next
      })

      setTeams((prev) => {
        if (!mainRunning || mainFinished) return prev
        return prev.map((t) => {
          if (!activePenaltyIds.includes(t.id) || t.completedThisCycle) return t
          const nextPenalty = t.penaltySeconds - 1
          if (nextPenalty <= 0) {
            completedPenaltyIds.push(t.id)
            return {
              ...t,
              penaltySeconds: 60,
              penaltyFinished: true,
              completedThisCycle: true,
            }
          }
          return {
            ...t,
            penaltySeconds: nextPenalty,
            penaltyFinished: false,
          }
        })
      })

      if (completedPenaltyIds.length > 0) {
        setSelectedIds((prev) => prev.filter((id) => !completedPenaltyIds.includes(id)))
        setActivePenaltyIds((prev) => prev.filter((id) => !completedPenaltyIds.includes(id)))
        playPenaltyAlarm()
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [mainRunning, mainFinished, activePenaltyIds, playPenaltyAlarm, playMainAlarm])

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (!mainFinished) return

    setMainRounds((prev) => prev + 1)

    const resetSeconds = (parseInt(globalMins, 10) || 0) * 60 + (parseInt(globalSecs, 10) || 0)
    if (resetSeconds > 0) {
      setMainSeconds(resetSeconds)
    }
    setMainRunning(false)
    setMainFinished(false)
    setActivePenaltyIds([])
    setTeams((prev) => prev.map((t) => ({ ...t, completedThisCycle: false, penaltyFinished: false })))
    cycleStartedRef.current = false
    mainAlarmFiredRef.current = false
  }, [mainFinished, globalMins, globalSecs])

  function startAll() {
    initializeAudio()
    if (mainSeconds <= 0) return
    if (!cycleStartedRef.current) {
      const nextActivePenaltyIds = selectedIds.filter((id) => {
        const team = teams.find((t) => t.id === id)
        return team && !team.completedThisCycle
      })

      setActivePenaltyIds(nextActivePenaltyIds)
      setSelectedIds([])
      cycleStartedRef.current = true
    }
    setMainRunning(true)
  }

  function pauseAll() {
    initializeAudio()
    setMainRunning(false)
  }

  function resetAll() {
    initializeAudio()
    const newTime = parseInt(globalMins, 10) * 60 + parseInt(globalSecs, 10)
    if (newTime > 0) {
      setMainSeconds(newTime)
      setMainRunning(false)
      setMainFinished(false)
      mainAlarmFiredRef.current = false
      cycleStartedRef.current = false
      setTeams((prev) =>
        prev.map((t) => ({
          ...t,
          penaltySeconds: 60,
          penaltyFinished: false,
          completedThisCycle: false,
        }))
      )
      setSelectedIds([])
      setActivePenaltyIds([])
      setMainRounds(0)
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

  const allRunning = mainRunning
  const allPaused = !mainRunning
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

      {/* Penalty selection panel */}
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
          <span className="control-label">Penalty per team:</span>
          <span className="selection-summary">01:00 fixed</span>
        </div>

        {selectedTeams.length > 0 && (
          <div className="selected-badge">
            {selectedTeams.map((team) => (
              <span key={team.id} className="selected-chip">
                <span style={{ color: '#22c55e' }}>●</span>
                {team.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={`main-timer-card ${mainFinished ? 'main-timer-finished' : ''}`}>
        <span className="main-timer-card-label">Main Timer</span>
        <div className="main-timer-card-value-wrap">
          <span className="main-timer-dot" aria-hidden="true">●</span>
          <span className="main-timer-value">
            {String(Math.floor(mainSeconds / 60)).padStart(2, '0')}:{String(mainSeconds % 60).padStart(2, '0')}
          </span>
        </div>
        <span className="main-timer-card-label">Rounds run: {mainRounds}</span>
      </div>

      {/* Timer grid */}
      <div className="timer-grid">
        {teams.map((team) => (
          <TeamTimer
            key={team.id}
            team={team}
            isSelected={selectedIds.includes(team.id)}
            penaltiesActive={mainRunning && !mainFinished}
            isActivePenalty={activePenaltyIds.includes(team.id)}
            onSelect={() => toggleSelectedTeam(team.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default TimerBoard
