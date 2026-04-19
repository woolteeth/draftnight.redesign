import { useState } from 'react'
import { initialState } from './initialState'

export function useDraftState() {
  const [state, setState] = useState(initialState)

  function updateState(changes) {
    setState(prev => ({ ...prev, ...changes }))
  }

  function setPhase(phase) {
    updateState({ phase })
  }

  function setPlayers(players) {
    updateState({ players })
  }

  function setTeams(teams) {
    updateState({ teams })
  }

  function addPick(pick) {
    setState(prev => ({ ...prev, picks: [...prev.picks, pick] }))
  }

  function removePick(pickIndex) {
    setState(prev => ({
      ...prev,
      picks: prev.picks.filter((_, i) => i !== pickIndex)
    }))
  }

  function setConfig(config) {
    updateState({ config })
  }

  function setDraftOrder(draftOrder) {
    updateState({ draftOrder })
  }

  function setSelectedPlayer(playerId) {
    updateState({ selectedPlayerId: playerId })
  }

  function resetDraft() {
    setState(initialState)
  }
function markPlayerDrafted(playerId, teamIdx, bid) {
  setState(prev => {
    const players = prev.players.map(p =>
      p.id === playerId ? { ...p, drafted: true } : p
    )
    const teams = prev.teams.map((t, i) => {
      if (i !== teamIdx) return t
      const player = prev.players.find(p => p.id === playerId)
      return {
        ...t,
        roster: [...t.roster, { ...player, drafted: true }],
        budget: t.budget - bid,
      }
    })
    return { ...prev, players, teams }
  })
}

function advanceNominator() {
  setState(prev => ({
    ...prev,
    currentAuctionNomIdx: prev.currentAuctionNomIdx + 1,
  }))
}

function advanceSerpentine() {
  setState(prev => ({
    ...prev,
    serpPickIdx: prev.serpPickIdx + 1,
  }))
}

function checkPhaseTransition() {
  setState(prev => {
    const auctionPickCount = prev.picks.filter(p => !p.isKeeper && p.phase === 'auction').length
    const totalAuctionPicks = (prev.config?.auctionRounds || 0) * (prev.teams?.length || 0)
    if (prev.phase === 'auction' && auctionPickCount >= totalAuctionPicks) {
      const newPhase = prev.config?.serpentineRounds > 0 ? 'serpentine' : 'done'
      return { ...prev, phase: newPhase }
    }
    const serpPickCount = prev.picks.filter(p => p.phase === 'serpentine').length
    const totalSerpPicks = (prev.config?.serpentineRounds || 0) * (prev.teams?.length || 0)
    if (prev.phase === 'serpentine' && serpPickCount >= totalSerpPicks) {
      return { ...prev, phase: 'done' }
    }
    return prev
  })
}
 return {
  state,
  setPhase,
  setPlayers,
  setTeams,
  addPick,
  removePick,
  setConfig,
  setDraftOrder,
  setSelectedPlayer,
  resetDraft,
  updateState,
  markPlayerDrafted,
  advanceNominator,
  advanceSerpentine,
  checkPhaseTransition,
}
}