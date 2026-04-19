import './index.css'
import { useState } from 'react'
import { useDraftState } from './state/useDraftState'
import HomeScreen from './components/screens/HomeScreen'
import SetupScreen from './components/screens/SetupScreen'
import { loadDraft, createDraft } from './data/draftService'

function App() {
  const [appPhase, setAppPhase] = useState('home')
  const { state, setPhase, setConfig, setTeams, setPlayers, updateState } = useDraftState()

  async function handleLoadDraft(id) {
    const record = await loadDraft(id)
    if (!record) return
    updateState({
      phase:   record.phase,
      config:  record.config,
      teams:   record.teams,
      players: record.players,
      picks:   record.picks || [],
    })
    setAppPhase('draft')
  }

  function handleNewDraft() {
    setAppPhase('setup')
  }

async function handleStartDraft({ config, teams, players }) {
  setConfig(config)
  setTeams(teams)
  setPlayers(players)
  setPhase('auction')

  const record = await createDraft(config, teams, players)
  if (record) {
    updateState({ pbRecordId: record.id })
  }

  setAppPhase('draft')
}
  return (
    <div>
      {appPhase === 'home' && (
        <HomeScreen
          onNewDraft={handleNewDraft}
          onLoadDraft={handleLoadDraft}
        />
      )}
      {appPhase === 'setup' && (
        <SetupScreen onStartDraft={handleStartDraft} />
      )}
      {appPhase === 'draft' && (
        <div style={{ color: 'var(--accent)', padding: 40, fontFamily: 'Bebas Neue', fontSize: 32 }}>
          DRAFT SCREEN — COMING SOON
        </div>
      )}
    </div>
  )
}

export default App