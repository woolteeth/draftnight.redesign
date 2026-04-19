import './index.css'
import { useState } from 'react'
import { useDraftState } from './state/useDraftState'
import HomeScreen from './components/screens/HomeScreen'
import SetupScreen from './components/screens/SetupScreen'
import DraftScreen from './components/screens/DraftScreen'
import NewDraftWizard from './components/NewDraftWizard'
import { loadDraft, createDraft } from './data/draftService'

function App() {
  const [appPhase, setAppPhase]         = useState('home')
  const [showWizard, setShowWizard]     = useState(false)
  const [wizardConfig, setWizardConfig] = useState(null)

  const {
    state,
    setPhase,
    setConfig,
    setTeams,
    setPlayers,
    updateState,
    addPick,
    markPlayerDrafted,
    advanceNominator,
    advanceSerpentine,
    checkPhaseTransition,
  } = useDraftState()

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

  function handleWizardComplete(config) {
    setWizardConfig(config)
    setShowWizard(false)
    setAppPhase('setup')
  }

async function handleStartDraft({ config, teams, players, keeperPicks = [] }) {
  setConfig(config)
  setTeams(teams)
  setPlayers(players)
  setPhase(config.auctionRounds > 0 ? 'auction' : 'serpentine')
  if (keeperPicks.length > 0) {
    updateState({ picks: keeperPicks })
  }

  const record = await createDraft(config, teams, players)
  if (record) updateState({ pbRecordId: record.id })

  setAppPhase('draft')
}

  return (
    <div>
      {showWizard && (
        <NewDraftWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
          onSkip={() => { setShowWizard(false); setAppPhase('setup') }}
        />
      )}

      {appPhase === 'home' && (
        <HomeScreen
          onNewDraft={() => setShowWizard(true)}
          onLoadDraft={handleLoadDraft}
        />
      )}

      {appPhase === 'setup' && (
        <SetupScreen
          wizardConfig={wizardConfig}
          onStartDraft={handleStartDraft}
        />
      )}

      {appPhase === 'draft' && (
        <DraftScreen
          state={state}
          actions={{
            addPick,
            markPlayerDrafted,
            advanceNominator,
            advanceSerpentine,
            checkPhaseTransition,
          }}
          onOpenSettings={() => setAppPhase('setup')}
        />
      )}
    </div>
  )
}

export default App
