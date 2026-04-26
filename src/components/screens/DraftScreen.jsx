import { useState } from 'react'
import { getAvailablePlayers, getNominatorTeamIdx, posColor } from '../../logic/draftLogic'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export default function DraftScreen({ state, actions, onOpenSettings }) {
  const { config, teams, players, picks, phase } = state
  const [filterPos, setFilterPos]       = useState('ALL')
  const [searchText, setSearchText]     = useState('')
  const [hideDrafted, setHideDrafted]   = useState(false)
  const [selectedId, setSelectedId]     = useState(null)
  const [bidAmount, setBidAmount]       = useState(1)
  const [winningTeam, setWinningTeam]   = useState(null)

  const isAuction    = phase === 'auction'
  const isSerpentine = phase === 'serpentine'
  const isDone       = phase === 'done'

  const draftOrder  = state.draftOrder || teams.map((_, i) => i)
  const nomIdx      = state.currentAuctionNomIdx || 0
  const nomTeamIdx  = getNominatorTeamIdx(draftOrder, nomIdx)
  const nomTeam     = teams[nomTeamIdx]

  const serpIdx     = state.serpPickIdx || 0
  const serpTeamIdx = isSerpentine ? getSerpTeamForPick(draftOrder, serpIdx, teams.length) : null
  const serpTeam    = isSerpentine ? teams[serpTeamIdx] : null
  const onClockIdx  = isAuction ? nomTeamIdx : serpTeamIdx
  const onClockTeam = isAuction ? nomTeam : serpTeam

  // Filtered player pool
  const available = players.filter(p => {
    if (hideDrafted && p.drafted) return false
    if (filterPos !== 'ALL' && p.position !== filterPos) return false
    if (searchText && !p.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !p.nflTeam?.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  const selectedPlayer  = players.find(p => p.id === selectedId)
  const nonKeeperPicks  = picks.filter(p => !p.isKeeper).length

function getSerpTeamForPick(order, pickIdx, numTeams) {
  if (!order || order.length === 0) return 0
  const round      = Math.floor(pickIdx / numTeams)
  const posInRound = pickIdx % numTeams
  const isReverse  = round % 2 === 1
  const orderPos   = isReverse ? (numTeams - 1 - posInRound) : posInRound
  return order[orderPos]
}

  function handleSelectPlayer(id) {
    setSelectedId(id)
    setBidAmount(1)
    setWinningTeam(null)
  }

function handleConfirmAuction() {
  if (!selectedPlayer || winningTeam === null) return

  const team = teams[winningTeam]
  if (!team) return

  // Budget check
  if (bidAmount > team.budget) {
    alert(`${team.name} only has $${team.budget} remaining`)
    return
  }

  // $1 per remaining spot check
  const auctionRounds = config?.auctionRounds || 0
  const auctionPicksMade = picks.filter(p => p.teamIdx === winningTeam && p.phase === 'auction' && !p.isKeeper).length
  const spotsRemaining = auctionRounds - auctionPicksMade - 1
  if (bidAmount > team.budget - spotsRemaining) {
    alert(`Must keep $1 per remaining auction spot. Max bid: $${team.budget - spotsRemaining}`)
    return
  }

  // Position limit check
  const posLimit = config?.posLimits?.[selectedPlayer.position] || 0


  if (posLimit > 0) {
    const posCount = picks.filter(p => {
      const pl = players.find(x => x.id === p.playerId)
      return p.teamIdx === winningTeam && pl?.position === selectedPlayer.position
    }).length
    if (posCount >= posLimit) {
      alert(`${team.name} has reached the ${selectedPlayer.position} limit (${posLimit})`)
      return
    }
  // Auction rounds per team check
     const auctionPicksMade = picks.filter(p => 
      p.teamIdx === winningTeam && p.phase === 'auction' && !p.isKeeper
    ).length
    if (auctionPicksMade >= auctionRounds) {
      alert(`${team.name} has already filled all ${auctionRounds} auction spots`)
      return
    }
  }

  const pick = {
    playerId:   selectedPlayer.id,
    playerName: selectedPlayer.name,
    position:   selectedPlayer.position,
    teamIdx:    winningTeam,
    bid:        bidAmount,
    phase:      'auction',
    pickNum:    picks.filter(p => !p.isKeeper).length + 1,
    isKeeper:   false,
    ts:         Date.now(),
  }
  actions.addPick(pick)
  actions.markPlayerDrafted(selectedPlayer.id, winningTeam, bidAmount)
  actions.advanceNominator()
  actions.checkPhaseTransition()
  setSelectedId(null)
  setBidAmount(1)
  setWinningTeam(null)
}

  function handleConfirmSerpentine() {
    if (!selectedPlayer) return
      // Position limit check
  const posLimit = config?.posLimits?.[selectedPlayer.position] || 0
  if (posLimit > 0) {
    const posCount = picks.filter(p => {
      const pl = players.find(x => x.id === p.playerId)
      return p.teamIdx === serpTeamIdx && pl?.position === selectedPlayer.position
    }).length
    if (posCount >= posLimit) {
      alert(`${teams[serpTeamIdx]?.name} has reached the ${selectedPlayer.position} limit (${posLimit})`)
      return
    }
  }
    const pick = {
      playerId:   selectedPlayer.id,
      playerName: selectedPlayer.name,
      position:   selectedPlayer.position,
      teamIdx:    serpTeamIdx,
      bid:        0,
      phase:      'serpentine',
      pickNum:    picks.filter(p => !p.isKeeper).length + 1,
      isKeeper:   false,
      ts:         Date.now(),
    }
    actions.addPick(pick)
    actions.markPlayerDrafted(selectedPlayer.id, serpTeamIdx, 0)
    actions.advanceSerpentine()
    actions.checkPhaseTransition()
    setSelectedId(null)
  }

  const auctionReady    = isAuction    && selectedPlayer && winningTeam !== null
  const serpentineReady = isSerpentine && selectedPlayer

  // Team panel helpers
  function getTeamPositionCounts(team) {
    const teamPicks = picks.filter(p => p.teamIdx === team.id)
    const counts = {}
    POSITIONS.forEach(pos => { counts[pos] = 0 })
    teamPicks.forEach(pick => {
      const player = players.find(p => p.id === pick.playerId)
      if (player && counts[player.position] !== undefined) {
        counts[player.position]++
      }
    })
    return counts
  }

  function getBudgetColor(budget, maxBudget) {
    const pct = budget / (maxBudget || 200)
    if (pct > 0.4) return '#22c55e'
    if (pct > 0.2) return '#f0b429'
    return '#ef4444'
  }

  return (
    <div style={S.screen}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.draftName}>{config?.draftName || 'DRAFT NIGHT'}</div>
          <div style={S.phaseBadge}>
            {isAuction ? '🔨 AUCTION' : '🐍 SERPENTINE'} — PICK {nonKeeperPicks + 1}
          </div>
          <div style={S.headerStat}>
            <span style={S.headerStatVal}>{players.filter(p => !p.drafted).length}</span>
            <span style={S.headerStatLbl}>AVAILABLE</span>
          </div>
          {isAuction && (
            <div style={S.headerStat}>
              <span style={S.headerStatVal}>
                {(config?.auctionRounds || 0) * (teams?.length || 0) - nonKeeperPicks}
              </span>
              <span style={S.headerStatLbl}>AUC LEFT</span>
            </div>
          )}
        </div>
        <div style={S.headerRight}>
          <button style={S.undoBtn} onClick={actions.undoLastPick}>↩ UNDO</button>
          <button style={S.settingsBtn} onClick={onOpenSettings}>⚙ SETTINGS</button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={S.layout}>

        {/* Left: Player Pool */}
        <div style={S.poolPanel}>
          <div style={S.panelTitle}>PLAYER POOL ({available.filter(p => !p.drafted).length})</div>

          {/* Search */}
          <div style={S.searchRow}>
            <input
              style={S.searchInput}
              type="text"
              placeholder="Search players..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          {/* Position Filter */}
          <div style={S.filterRow}>
            {['ALL', ...POSITIONS].map(pos => (
              <button key={pos}
                style={{
                  ...S.filterBtn,
                  ...(filterPos === pos ? S.filterBtnActive : {}),
                  ...(filterPos === pos && pos !== 'ALL' ? { color: posColor(pos), borderColor: posColor(pos) } : {})
                }}
                onClick={() => setFilterPos(pos)}>
                {pos}
              </button>
            ))}
          </div>

          {/* Hide Drafted */}
          <label style={S.hideDraftedRow}>
            <input
              type="checkbox"
              checked={hideDrafted}
              onChange={e => setHideDrafted(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={S.hideDraftedLabel}>Hide drafted</span>
          </label>

          {/* Player List */}
          <div style={S.playerList}>
            {available.length === 0 ? (
              <div style={S.emptyPool}>NO PLAYERS FOUND</div>
            ) : available.map(p => (
              <div key={p.id}
                style={{
                  ...S.playerRow,
                  ...(p.drafted ? S.playerRowDrafted : {}),
                  ...(selectedId === p.id ? S.playerRowSelected : {}),
                }}
                onClick={() => !p.drafted && handleSelectPlayer(p.id)}>
                <span style={{ ...S.playerPos, color: posColor(p.position) }}>{p.position}</span>
                <div style={S.playerInfo}>
                  <span style={{ ...S.playerName, ...(p.drafted ? { textDecoration: 'line-through', opacity: 0.5 } : {}) }}>
                    {p.name}
                  </span>
                  <span style={S.playerMeta}>{p.nflTeam}{p.byeWeek ? ` · Bye ${p.byeWeek}` : ''}</span>
                </div>
                {p.auctionValue > 0 && (
                  <span style={{ ...S.playerValue, ...(p.drafted ? { opacity: 0.4 } : {}) }}>
                    ${p.auctionValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center: OTC + Board */}
        <div style={S.centerPanel}>

          {/* On The Clock */}
          <div style={S.otcPanel}>
            <div style={S.panelTitle}>ON THE CLOCK</div>
            <div style={S.otcTeam}>{onClockTeam?.name || '—'}</div>

            {/* Auction Controls */}
            {isAuction && (
              <div style={S.controls}>
                {selectedPlayer ? (
                  <>
                    <div style={S.nominatedPlayer}>
                      <span style={{ ...S.nominatedPos, color: posColor(selectedPlayer.position) }}>
                        {selectedPlayer.position}
                      </span>
                      <span style={S.nominatedName}>{selectedPlayer.name}</span>
                      {selectedPlayer.auctionValue > 0 && (
                        <span style={S.nominatedValue}>proj ${selectedPlayer.auctionValue}</span>
                      )}
                    </div>

                    <div style={S.bidRow}>
                      <div style={S.fieldLabel}>WINNING BID</div>
                      <div style={S.bidControls}>
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => Math.max(1, b - 10))}>-10</button>
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => Math.max(1, b - 5))}>-5</button>
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => Math.max(1, b - 1))}>-1</button>
                        <input style={S.bidInput} type="number" min="1"
                          value={bidAmount}
                          onFocus={e => e.target.select()}
                          onChange={e => setBidAmount(parseInt(e.target.value) || 1)} />
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => b + 1)}>+1</button>
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => b + 5)}>+5</button>
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => b + 10)}>+10</button>
                      </div>
                    </div>

                    <div style={S.bidRow}>
                      <div style={S.fieldLabel}>WINNING TEAM</div>
                      <div style={S.teamSelectRow}>
                        {teams.map((t, i) => (
                          <button key={i}
                            style={{ ...S.teamSelectBtn, ...(winningTeam === i ? S.teamSelectBtnActive : {}) }}
                            onClick={() => setWinningTeam(i)}>
                            {t.name}
                            {t.budget !== undefined && isAuction && (
                              <span style={S.teamBudgetTag}> ${t.budget}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={S.actionRow}>
                      <button
                        style={{ ...S.confirmBtn, ...(!auctionReady ? S.confirmBtnDisabled : {}) }}
                        disabled={!auctionReady}
                        onClick={handleConfirmAuction}>
                        CONFIRM PICK
                      </button>
                      <button style={S.clearBtn} onClick={() => setSelectedId(null)}>CLEAR</button>
                    </div>
                  </>
                ) : (
                  <div style={S.waitingMsg}>← SELECT A PLAYER TO NOMINATE</div>
                )}
              </div>
            )}

            {/* Serpentine Controls */}
            {isSerpentine && (
              <div style={S.controls}>
                {selectedPlayer ? (
                  <>
                    <div style={S.nominatedPlayer}>
                      <span style={{ ...S.nominatedPos, color: posColor(selectedPlayer.position) }}>
                        {selectedPlayer.position}
                      </span>
                      <span style={S.nominatedName}>{selectedPlayer.name}</span>
                    </div>
                    <div style={S.actionRow}>
                      <button
                        style={{ ...S.confirmBtn, ...(!serpentineReady ? S.confirmBtnDisabled : {}) }}
                        disabled={!serpentineReady}
                        onClick={handleConfirmSerpentine}>
                        CONFIRM PICK
                      </button>
                      <button style={S.clearBtn} onClick={() => setSelectedId(null)}>CLEAR</button>
                    </div>
                  </>
                ) : (
                  <div style={S.waitingMsg}>← SELECT A PLAYER TO PICK</div>
                )}
              </div>
            )}
          </div>

          {/* Draft Board */}
          <div style={S.boardPanel}>
            <div style={S.panelTitle}>DRAFT BOARD</div>
            <div style={S.boardScroll}>
              <table style={S.board}>
                <thead>
                  <tr>
                    <th style={S.boardRdHeader}>RD</th>
                    {teams.map((t, i) => (
                      <th key={i} style={{
                        ...S.boardTeamHeader,
                        ...(i === onClockIdx ? { color: 'var(--accent)', borderBottom: '2px solid var(--accent)' } : {})
                      }}>
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: config?.totalRounds || 15 }, (_, rdIdx) => {
                    const round = rdIdx + 1
                    return (
                      <tr key={round}>
                        <td style={S.boardRd}>{round}</td>
                        {teams.map((_, teamIdx) => {
                          const teamPicks = picks
                            .filter(p => p.teamIdx === teamIdx)
                            .sort((a, b) => {
                              if (a.isKeeper && !b.isKeeper) return -1
                              if (!a.isKeeper && b.isKeeper) return 1
                              return a.pickNum - b.pickNum
                            })
                          const pick = teamPicks[round - 1]
                          return (
                            <td key={teamIdx} style={{
                              ...S.boardCell,
                              ...(teamIdx === onClockIdx ? { background: 'rgba(240,180,41,0.03)' } : {})
                            }}>
                              {pick ? (
                                <div style={{
                                  ...S.boardPick,
                                  borderLeft: `3px solid ${posColor(pick.position)}`,
                                  ...(pick.isKeeper ? S.boardPickKeeper : {}),
                                }}>
                                  <span style={{ color: posColor(pick.position), fontSize: 9 }}>{pick.position}</span>
                                  <span style={S.boardPickName}>{pick.playerName}</span>
                                  {pick.bid > 0 && <span style={S.boardPickBid}>${pick.bid}</span>}
                                  {pick.isKeeper && <span style={S.keeperTag}>K</span>}
                                </div>
                              ) : (
                                <div style={S.boardEmpty} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right: Teams Panel */}
        <div style={S.teamsPanel}>
          <div style={S.panelTitle}>TEAMS</div>
          <div style={S.teamsList}>
            {draftOrder.map(ti => {
              const team    = teams[ti]
              if (!team) return null
              const isOnClock = ti === onClockIdx
              const budget    = team.budget ?? config?.auctionBudget ?? 200
              const maxBudget = config?.auctionBudget || 200
              const budgetPct = Math.max(0, Math.min(1, budget / maxBudget))
              const barColor  = getBudgetColor(budget, maxBudget)
              const teamPicks = picks.filter(p => p.teamIdx === ti)
              const posCounts = getTeamPositionCounts(team)
              const posLimits = config?.posLimits || {}

              return (
                <div key={ti} style={{
                  ...S.teamCard,
                  ...(isOnClock ? S.teamCardOnClock : {}),
                }}>
                  {isOnClock && (
                    <div style={S.onClockBadge}>▶ ON THE CLOCK</div>
                  )}
                  <div style={S.teamCardName}>{team.name}</div>

                  {isAuction && (
                    <>
                      <div style={S.teamCardStats}>
                        <span style={{ color: barColor, fontWeight: 600 }}>${budget}</span>
                        <span style={S.teamCardStatLabel}>remaining</span>
                        <span style={S.teamCardStatDivider}>·</span>
                        <span>{teamPicks.filter(p => p.phase === 'auction').length}/{config?.auctionRounds || 0}</span>
                        <span style={S.teamCardStatLabel}>auc</span>
                      </div>
                      <div style={S.budgetBarTrack}>
                        <div style={{
                          ...S.budgetBarFill,
                          width: `${budgetPct * 100}%`,
                          background: barColor,
                        }} />
                      </div>
                    </>
                  )}

                  <div style={S.posCountRow}>
                    {POSITIONS.filter(pos => (posLimits[pos] || 0) > 0).map(pos => {
                      const count = posCounts[pos] || 0
                      const max   = posLimits[pos] || 0
                      const full  = count >= max
                      return (
                        <div key={pos} style={{
                          ...S.posCount,
                          background: `${posColor(pos)}22`,
                          color: full ? 'var(--text-muted)' : posColor(pos),
                          opacity: full ? 0.5 : 1,
                        }}>
                          {count}/{max} {pos}
                        </div>
                      )
                    })}
                  </div>

                  {teamPicks.length > 0 && (
                    <div style={S.miniRoster}>
                      {teamPicks.slice(-3).map((pick, i) => {
                        const player = players.find(p => p.id === pick.playerId)
                        if (!player) return null
                        return (
                          <div key={i} style={S.miniPick}>
                            <span style={{ color: posColor(player.position), fontSize: 9, minWidth: 24 }}>
                              {player.position}
                            </span>
                            <span style={S.miniPickName}>{player.name}</span>
                            {pick.bid > 0 && (
                              <span style={S.miniPickBid}>${pick.bid}</span>
                            )}
                          </div>
                        )
                      })}
                      {teamPicks.length > 3 && (
                        <div style={S.miniPickMore}>+{teamPicks.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

const S = {
  screen: { height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'},

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)', flexShrink: 0,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 20 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  draftName:   { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 4, color: 'var(--accent)' },
  phaseBadge:  { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: 'var(--text-muted)' },
  headerStat:  { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  headerStatVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--accent)', lineHeight: 1 },
  headerStatLbl: { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)' },
  settingsBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2,
    padding: '6px 14px', cursor: 'pointer',
  },

  layout: { flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 },

  // LEFT: Player Pool
  poolPanel: {
    width: 260, minWidth: 260, flexShrink: 0,
    background: 'var(--surface)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  searchRow: { padding: '8px 10px', borderBottom: '1px solid var(--border)' },
  searchInput: {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text)',
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
    padding: '6px 10px',
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--border)' },
  filterBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 3, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1,
    padding: '3px 7px', cursor: 'pointer',
  },
  filterBtnActive: { background: 'var(--surface2)', color: 'var(--text)' },
  hideDraftedRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  hideDraftedLabel: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, color: 'var(--text-muted)' },
  playerList: { flex: 1, overflowY: 'auto' },
  playerRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  playerRowDrafted: { opacity: 0.4, cursor: 'default' },
  playerRowSelected: { background: 'rgba(240,180,41,0.08)', borderLeft: '2px solid var(--accent)' },
  playerPos:  { fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, minWidth: 28 },
  playerInfo: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  playerName: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  playerMeta: { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-muted)' },
  playerValue: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--accent)', flexShrink: 0 },
  emptyPool: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)', padding: 20, textAlign: 'center' },

  // CENTER
  centerPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },

  otcPanel: { background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  otcTeam: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 4, color: 'var(--text)', padding: '8px 16px 4px' },
  controls: { padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 },

  nominatedPlayer: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 12px',
  },
  nominatedPos:   { fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600 },
  nominatedName:  { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 2, flex: 1 },
  nominatedValue: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-muted)' },

  bidRow:     { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)' },
  bidControls: { display: 'flex', alignItems: 'center', gap: 4 },
  bidBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 3, color: 'var(--text)', fontSize: 12,
    padding: '4px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace",
  },
  bidInput: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text)',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, textAlign: 'center',
    width: 70, padding: '4px',
  },

  teamSelectRow: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  teamSelectBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 3, color: 'var(--text-muted)',
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
    padding: '3px 9px', cursor: 'pointer',
  },
  teamSelectBtnActive: { background: 'rgba(240,180,41,0.12)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  teamBudgetTag: { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--green)' },

  actionRow: { display: 'flex', gap: 10, alignItems: 'center' },
  confirmBtn: {
    background: 'rgba(240,180,41,0.2)', border: '1px solid var(--accent)',
    borderRadius: 4, color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 3,
    padding: '8px 20px', cursor: 'pointer',
  },
  confirmBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  clearBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
    padding: '5px 14px', cursor: 'pointer',
  },
  waitingMsg: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: 'var(--text-muted)', padding: '12px 0' },

  boardPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  boardScroll: { flex: 1, overflow: 'auto' },
  board: { width: '100%', borderCollapse: 'collapse', fontFamily: "'Barlow Condensed', sans-serif" },
  boardRdHeader: {
    fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)',
    padding: '6px 10px', textAlign: 'center',
    background: 'var(--surface)', position: 'sticky', top: 0,
    borderBottom: '1px solid var(--border)', width: 36,
  },
  boardTeamHeader: {
    fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, color: 'var(--text-muted)',
    padding: '6px 5px', textAlign: 'center',
    background: 'var(--surface)', position: 'sticky', top: 0,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 100,
  },
  boardRd: {
    fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-muted)',
    padding: '3px 8px', textAlign: 'center',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
  },
  boardCell: { padding: '2px 3px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', minWidth: 80 },
  boardPick: { background: 'var(--surface2)', borderRadius: 3, padding: '3px 5px', display: 'flex', flexDirection: 'column', gap: 1 },
  boardPickKeeper: { background: 'rgba(240,180,41,0.08)' },
  boardPickName: { fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  boardPickBid:  { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--accent)' },
  keeperTag: {
    fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'var(--accent)',
    background: 'rgba(240,180,41,0.2)', borderRadius: 2, padding: '1px 3px', alignSelf: 'flex-start',
  },
  boardEmpty: { height: 38 },

  // RIGHT: Teams Panel
  teamsPanel: {
    width: 220, minWidth: 220, flexShrink: 0,
    background: 'var(--surface)', borderLeft: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  teamsList: { flex: 1, overflowY: 'auto' },
  teamCard: {
    padding: '10px 12px', borderBottom: '1px solid var(--border)',
    cursor: 'default',
  },
  teamCardOnClock: {
    background: 'rgba(240,180,41,0.06)',
    borderLeft: '3px solid var(--accent)',
  },
  onClockBadge: {
    fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2,
    color: 'var(--accent)', marginBottom: 4,
  },
  teamCardName: {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
    fontSize: 15, marginBottom: 4,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  teamCardStats: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontFamily: "'DM Mono', monospace", fontSize: 11, marginBottom: 4,
  },
  teamCardStatLabel: { color: 'var(--text-muted)', fontSize: 9 },
  teamCardStatDivider: { color: 'var(--border)' },
  budgetBarTrack: { height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  budgetBarFill:  { height: '100%', borderRadius: 2, transition: 'width 0.3s ease' },
  posCountRow: { display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 },
  posCount: {
    fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 0.5,
    borderRadius: 3, padding: '1px 5px',
  },
  miniRoster: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 },
  miniPick: { display: 'flex', alignItems: 'center', gap: 5 },
  miniPickName: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  miniPickBid:  { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--accent)' },
  miniPickMore: { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-muted)', marginTop: 2 },

  panelTitle: {
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, color: 'var(--text-muted)',
    padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0,
  },
  undoBtn: {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 4, color: 'var(--text-muted)',
  fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2,
  padding: '6px 14px', cursor: 'pointer',
},
}
