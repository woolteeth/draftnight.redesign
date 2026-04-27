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

function removePick(pickNum) {
  setState(prev => {
    const pick = prev.picks.find(p => p.pickNum === pickNum)
    if (!pick) return prev
    const players = prev.players.map(p =>
      p.id === pick.playerId ? { ...p, drafted: false } : p
    )
    const teams = prev.teams.map((t, i) => {
      if (i !== pick.teamIdx) return t
      return {
        ...t,
        budget: t.budget + (pick.bid || 0),
        roster: t.roster.filter(p => p.id !== pick.playerId),
      }
    })
    const picks = prev.picks.filter(p => p.pickNum !== pickNum)
    return { ...prev, picks, players, teams }
  })
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

  function undoLastPick() {
    setState(prev => {
      if (!prev.picks.length) return prev

      const picks = [...prev.picks]
      const lastPick = picks[picks.length - 1]
      if (!lastPick) return prev

      // Don't undo keepers
      if (lastPick.isKeeper) return prev

      // Un-draft the player
      const players = prev.players.map(p =>
        p.id === lastPick.playerId ? { ...p, drafted: false } : p
      )

      // Restore team budget and remove from roster
      const teams = prev.teams.map((t, i) => {
        if (i !== lastPick.teamIdx) return t
        return {
          ...t,
          budget: t.budget + (lastPick.bid || 0),
          roster: t.roster.filter(p => p.id !== lastPick.playerId),
        }
      })

      // Remove the pick
      picks.pop()

      // Roll back phase and counters if needed
      let phase = prev.phase
      let serpPickIdx = prev.serpPickIdx
      let currentAuctionNomIdx = prev.currentAuctionNomIdx

      if (lastPick.phase === 'serpentine') {
        serpPickIdx = Math.max(0, prev.serpPickIdx - 1)
        if (phase === 'done') phase = 'serpentine'
      } else if (lastPick.phase === 'auction') {
        currentAuctionNomIdx = Math.max(0, prev.currentAuctionNomIdx - 1)
        if (phase === 'serpentine' || phase === 'done') phase = 'auction'
      }

      return { ...prev, picks, players, teams, phase, serpPickIdx, currentAuctionNomIdx }
    })
  }
function editPick({ pickNum, bid, position, newTeamIdx, oldTeamIdx, oldBid, playerId }) {
  setState(prev => {
    const picks = prev.picks.map(p => {
      if (p.pickNum !== pickNum) return p
      return { ...p, bid, overridePosition: position, teamIdx: newTeamIdx }
    })
    const teams = prev.teams.map((t, i) => {
      if (i === oldTeamIdx) return { ...t, budget: t.budget + oldBid }
      return t
    }).map((t, i) => {
      if (i === newTeamIdx) return { ...t, budget: t.budget - bid }
      return t
    })
    return { ...prev, picks, teams }
  })
}
function addPenalty(teamIdx, note) {
  setState(prev => {
    const team = prev.teams[teamIdx]
    const penalty = {
      teamIdx,
      teamName: team?.name || '',
      note: note || '',
      nominationPos: prev.currentAuctionNomIdx,
      ts: Date.now(),
    }
    return {
      ...prev,
      penalties: [...prev.penalties, penalty],
      currentAuctionNomIdx: prev.currentAuctionNomIdx + 1,
    }
  })
}
function renameTeam(teamIdx, name) {
  setState(prev => ({
    ...prev,
    teams: prev.teams.map((t, i) => i === teamIdx ? { ...t, name } : t)
  }))
}
function addUnlistedPlayer({ id, name, position, nflTeam }) {
  setState(prev => {
    const newPlayer = {
      id:           id || Date.now(),
      name,
      position,
      nflTeam:      nflTeam || '?',
      overallRank:  9999,
      auctionValue: 0,
      byeWeek:      0,
      drafted:      false,
      notes:        'Unlisted',
    }
    return {
      ...prev,
      players:         [...prev.players, newPlayer],
    }
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
    undoLastPick,
    editPick,
    addPenalty,
    renameTeam,
    addUnlistedPlayer,
  }
}
