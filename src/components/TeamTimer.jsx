function pad(n) {
  return String(n).padStart(2, '0')
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

function getColor(seconds, maxSeconds) {
  if (seconds === 0) return '#ef4444'
  const ratio = seconds / maxSeconds
  if (ratio > 0.5) return '#22c55e'
  if (ratio > 0.25) return '#f59e0b'
  return '#ef4444'
}

function TeamTimer({ team, isSelected, onSelect, onToggle }) {
  const { name, seconds, running, finished } = team

  const progressColor = getColor(seconds, team.initialSeconds ?? seconds)

  let statusLabel = 'PAUSED'
  let statusClass = 'status-paused'
  if (finished) {
    statusLabel = 'TIME UP'
    statusClass = 'status-finished'
  } else if (running) {
    statusLabel = 'RUNNING'
    statusClass = 'status-running'
  }

  return (
    <div
      className={`timer-card ${isSelected ? 'timer-card-selected' : ''} ${finished ? 'timer-card-finished' : ''}`}
      onClick={onSelect}
    >
      <div className="timer-card-header">
        <span className="team-name">{name}</span>
        <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
      </div>

      <div
        className="timer-display"
        style={{ color: finished ? '#ef4444' : running ? '#22c55e' : '#e2e8f0' }}
      >
        {formatTime(seconds)}
      </div>

      <button
        className={`timer-toggle-btn ${running ? 'btn-pause-card' : 'btn-start-card'} ${finished ? 'btn-finished-card' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          if (!finished) onToggle()
        }}
        disabled={finished}
      >
        {finished ? 'TIME UP' : running ? 'Pause' : 'Start'}
      </button>

      {isSelected && !finished && (
        <div className="selected-indicator">✓ Selected for penalty</div>
      )}
    </div>
  )
}

export default TeamTimer
