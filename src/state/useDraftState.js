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
    updateState
  }
}