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

function TeamTimer({ team, isSelected, penaltiesActive, isActivePenalty, onSelect }) {
  const { name, penaltySeconds } = team

  const progressColor = getColor(penaltySeconds, 60)
  const penaltyRunning = isActivePenalty && penaltiesActive

  let statusLabel = 'PAUSED'
  let statusClass = 'status-paused'
  if (penaltyRunning) {
    statusLabel = 'RUNNING'
    statusClass = 'status-running'
  } else if (isSelected && (!penaltiesActive || !isActivePenalty)) {
    statusLabel = 'WAITING'
  }

  return (
    <div
      className={`timer-card ${isSelected ? 'timer-card-selected' : ''} ${penaltyRunning ? 'timer-card-penalty-active' : ''}`}
      onClick={onSelect}
    >
      <div className="timer-card-header">
        <span className="team-name">{name}</span>
        <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
      </div>

      <div
        className="timer-display"
        style={{ color: progressColor }}
      >
        {formatTime(penaltySeconds)}
      </div>

      <div className="selected-indicator">
        {isSelected
          ? penaltiesActive && isActivePenalty
            ? 'Penalty running'
            : penaltiesActive
              ? 'Starts next main timer'
              : 'Waiting for main timer'
          : 'Click to select penalty'}
      </div>

      <div className="penalty-caption">Penalty timer (fixed): 01:00</div>
    </div>
  )
}

export default TeamTimer
