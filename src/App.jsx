import './index.css'
import { useState, useEffect } from 'react'
import { useDraftState } from './state/useDraftState'
import HomeScreen from './components/screens/HomeScreen'
import SetupScreen from './components/screens/SetupScreen'
import DraftScreen from './components/screens/DraftScreen'
import NewDraftWizard from './components/NewDraftWizard'
import { loadDraft, createDraft, saveDraft } from './data/draftService'
import DoneScreen from './components/screens/DoneScreen'

function App() {
  const [appPhase, setAppPhase]         = useState('home')
  const [showWizard, setShowWizard]     = useState(false)
  const [wizardConfig, setWizardConfig] = useState(null)
  const [settingsMode, setSettingsMode] = useState(false)

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
    setDraftOrder,
    undoLastPick,
    editPick,
    removePick,
  } = useDraftState()

  useEffect(() => {
  if (state.phase === 'done' && appPhase === 'draft') {
    setAppPhase('done')
  }
                  }, [state.phase])

  useEffect(() => {
  if (!state.pbRecordId || appPhase !== 'draft') return
  saveDraft(state.pbRecordId, state)
                  }, [state.picks])

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

async function handleStartDraft({ config, teams, players, keeperPicks = [], draftOrder }) {
  const resolvedDraftOrder = draftOrder || teams.map((_, i) => i)

  updateState({
    config,
    teams,
    players,
    draftOrder: resolvedDraftOrder,
    phase: config.auctionRounds > 0 ? 'auction' : 'serpentine',
    picks: keeperPicks.length > 0 ? keeperPicks : [],
    currentAuctionNomIdx: 0,
    serpPickIdx: 0,
  })

    const record = await createDraft(config, teams, players)
    if (record) updateState({ pbRecordId: record.id })

    setSettingsMode(false)
    setAppPhase('draft')
  }

  function handleOpenSettings() {
    setSettingsMode(true)
    setAppPhase('setup')
  }

  function handleBackToDraft() {
    setSettingsMode(false)
    setAppPhase('draft')
  }
  function handleDevDraft() {
    const config = {
    draftName: 'TEST DRAFT',
    draftType: 'auction',
    numTeams: 4,
    totalRounds: 5,
    auctionRounds: 5,
    serpentineRounds: 0,
    auctionBudget: 200,
    nomOrder: 'serpentine',
    serpOrder: 'serpentine',
    keepersPerTeam: 0,
    posLimits: { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 },
    posMinLimits: { QB: 1, RB: 1, WR: 1, TE: 1, K: 0, DEF: 0 },
  }
  const teams = ['Team A', 'Team B', 'Team C', 'Team D'].map((name, i) => ({
    id: i, name, roster: [], budget: 200, picks: [],
  }))
  const players = Array.from({ length: 30 }, (_, i) => ({
    id: i, name: `Player ${i + 1}`,
    position: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE'][i % 6],
    nflTeam: 'NFL', overallRank: i + 1,
    auctionValue: 50 - i, drafted: false,
  }))
  setConfig(config)
  setTeams(teams)
  setPlayers(players)
  setPhase('auction')
  setDraftOrder([0, 1, 2, 3])
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
          onDevDraft={handleDevDraft}
        />
      )}

      {appPhase === 'setup' && (
        <SetupScreen
          wizardConfig={wizardConfig}
          settingsMode={settingsMode}
          currentState={state}
          onStartDraft={handleStartDraft}
          onBackToDraft={handleBackToDraft}
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
            undoLastPick,
          }}
          onOpenSettings={handleOpenSettings}
        />
      )}
{appPhase === 'done' && (
  <DoneScreen
    state={state}
    onUndoLastPick={() => { undoLastPick(); setAppPhase('draft') }}
    onBackToHome={() => setAppPhase('home')}
    actions={{ editPick, removePick }}
  />
)}
    </div>
  )
}

export default App
