import { useState } from 'react'
import Setup from './components/Setup.jsx'
import TimerBoard from './components/TimerBoard.jsx'
import './App.css'

function App() {
  // phase: 'setup' | 'board'
  const [phase, setPhase] = useState('setup')
  const [teams, setTeams] = useState([])

  function handleSetupComplete(teamList) {
    // teamList: [{ id, name, seconds }]
    setTeams(teamList)
    setPhase('board')
  }

  function handleReset() {
    setTeams([])
    setPhase('setup')
  }

  return (
    <div className="app">
      {phase === 'setup' ? (
        <Setup onComplete={handleSetupComplete} />
      ) : (
        <TimerBoard initialTeams={teams} onReset={handleReset} />
      )}
    </div>
  )
}

export default App
