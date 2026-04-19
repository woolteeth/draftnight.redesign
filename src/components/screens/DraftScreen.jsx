import { useState, useEffect } from 'react'
import { getAvailablePlayers, getNominatorTeamIdx, posColor } from '../../logic/draftLogic'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export default function DraftScreen({ state, actions, onOpenSettings }) {
  const { config, teams, players, picks, phase } = state
  const [filterPos, setFilterPos]     = useState('ALL')
  const [selectedId, setSelectedId]   = useState(null)
  const [bidAmount, setBidAmount]     = useState(1)
  const [winningTeam, setWinningTeam] = useState(null)

  const isAuction    = phase === 'auction'
  const isSerpentine = phase === 'serpentine'

  const nomIdx       = state.currentAuctionNomIdx || 0
  const nomTeamIdx   = getNominatorTeamIdx(state.draftOrder || teams.map((_, i) => i), nomIdx)
  const nomTeam      = teams[nomTeamIdx]
  const serpIdx      = state.serpPickIdx || 0
  const draftOrder   = state.draftOrder  || teams.map((_, i) => i)

  const serpOrder    = getSerpOrder(draftOrder, state.serpRound || 1)
  const serpTeamIdx  = isSerpentine ? serpOrder[serpIdx % serpOrder.length] : null
  const serpTeam     = isSerpentine ? teams[serpTeamIdx] : null
  const onClockTeam  = isAuction ? nomTeam : serpTeam

  const available    = getAvailablePlayers(players, filterPos)
  const selectedPlayer = players.find(p => p.id === selectedId)

  function getSerpOrder(order, round) {
    return round % 2 === 0 ? [...order].reverse() : [...order]
  }

  function handleSelectPlayer(id) {
    setSelectedId(id)
    setBidAmount(1)
    setWinningTeam(null)
  }

  function handleConfirmAuction() {
    if (!selectedPlayer || winningTeam === null) return
    const pick = {
      playerId:   selectedPlayer.id,
      playerName: selectedPlayer.name,
      position:   selectedPlayer.position,
      teamIdx:    winningTeam,
      bid:        bidAmount,
      phase:      'auction',
      pickNum:    picks.length + 1,
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
    const pick = {
      playerId:   selectedPlayer.id,
      playerName: selectedPlayer.name,
      position:   selectedPlayer.position,
      teamIdx:    serpTeamIdx,
      bid:        0,
      phase:      'serpentine',
      pickNum:    picks.length + 1,
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

  return (
    <div style={S.screen}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.draftName}>{config?.draftName || 'DRAFT NIGHT'}</div>
          <div style={S.phaseBadge}>
            {isAuction ? '🔨 AUCTION' : '🐍 SERPENTINE'} — PICK {picks.filter(p => !p.isKeeper).length + 1}
          </div>
        </div>
        <button style={S.settingsBtn} onClick={onOpenSettings}>⚙ SETTINGS</button>
      </div>

      {/* Main Layout */}
      <div style={S.layout}>

        {/* Left: Player Pool */}
        <div style={S.poolPanel}>
          <div style={S.panelTitle}>PLAYER POOL</div>

          {/* Position Filter */}
          <div style={S.filterRow}>
            {['ALL', ...POSITIONS].map(pos => (
              <button key={pos}
                style={{ ...S.filterBtn, ...(filterPos === pos ? S.filterBtnActive : {}),
                  ...(filterPos === pos && pos !== 'ALL' ? { color: posColor(pos), borderColor: posColor(pos) } : {}) }}
                onClick={() => setFilterPos(pos)}>
                {pos}
              </button>
            ))}
          </div>

          {/* Player List */}
          <div style={S.playerList}>
            {available.length === 0 ? (
              <div style={S.emptyPool}>NO PLAYERS AVAILABLE</div>
            ) : available.map(p => (
              <div key={p.id}
                style={{ ...S.playerRow, ...(selectedId === p.id ? S.playerRowSelected : {}) }}
                onClick={() => handleSelectPlayer(p.id)}>
                <span style={{ ...S.playerPos, color: posColor(p.position) }}>{p.position}</span>
                <span style={S.playerName}>{p.name}</span>
                <span style={S.playerMeta}>{p.nflTeam}</span>
                {p.auctionValue > 0 && (
                  <span style={S.playerValue}>${p.auctionValue}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Action + Board */}
        <div style={S.rightPanel}>

          {/* On The Clock */}
          <div style={S.otcPanel}>
            <div style={S.panelTitle}>ON THE CLOCK</div>

            <div style={S.otcTeam}>
              {onClockTeam?.name || '—'}
            </div>

            {isAuction && (
              <div style={S.auctionControls}>
                {selectedPlayer ? (
                  <>
                    <div style={S.nominatedPlayer}>
                      <span style={{ ...S.nominatedPos, color: posColor(selectedPlayer.position) }}>
                        {selectedPlayer.position}
                      </span>
                      <span style={S.nominatedName}>{selectedPlayer.name}</span>
                    </div>

                    <div style={S.bidRow}>
                      <div style={S.fieldLabel}>WINNING BID</div>
                      <div style={S.bidControls}>
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => Math.max(1, b - 1))}>−</button>
                        <input style={S.bidInput} type="number" min="1"
                          value={bidAmount}
                          onFocus={e => e.target.select()}
                          onChange={e => setBidAmount(parseInt(e.target.value) || 1)} />
                        <button style={S.bidBtn} onClick={() => setBidAmount(b => b + 1)}>+</button>
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
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      style={{ ...S.confirmBtn, ...(!auctionReady ? S.confirmBtnDisabled : {}) }}
                      disabled={!auctionReady}
                      onClick={handleConfirmAuction}>
                      CONFIRM PICK
                    </button>

                    <button style={S.clearBtn} onClick={() => setSelectedId(null)}>
                      CLEAR
                    </button>
                  </>
                ) : (
                  <div style={S.waitingMsg}>← SELECT A PLAYER TO NOMINATE</div>
                )}
              </div>
            )}

            {isSerpentine && (
              <div style={S.auctionControls}>
                {selectedPlayer ? (
                  <>
                    <div style={S.nominatedPlayer}>
                      <span style={{ ...S.nominatedPos, color: posColor(selectedPlayer.position) }}>
                        {selectedPlayer.position}
                      </span>
                      <span style={S.nominatedName}>{selectedPlayer.name}</span>
                    </div>

                    <button
                      style={{ ...S.confirmBtn, ...(!serpentineReady ? S.confirmBtnDisabled : {}) }}
                      disabled={!serpentineReady}
                      onClick={handleConfirmSerpentine}>
                      CONFIRM PICK
                    </button>

                    <button style={S.clearBtn} onClick={() => setSelectedId(null)}>
                      CLEAR
                    </button>
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
                      <th key={i} style={S.boardTeamHeader}>{t.name}</th>
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
                          const pick = picks.find(p =>
                            p.teamIdx === teamIdx && getPickRound(p.pickNum, teams.length) === round
                          )
                          return (
                            <td key={teamIdx} style={S.boardCell}>
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
      </div>
    </div>
  )
}

function getPickRound(pickNum, numTeams) {
  return Math.ceil(pickNum / numTeams)
}

const S = {
  screen: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  draftName: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 28, letterSpacing: 4, color: 'var(--accent)',
  },
  phaseBadge: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11, letterSpacing: 2, color: 'var(--text-muted)',
  },
  settingsBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11, letterSpacing: 2,
    padding: '8px 16px', cursor: 'pointer',
  },
  layout: {
    flex: 1, display: 'flex', overflow: 'hidden',
  },
  poolPanel: {
    width: 280, minWidth: 280,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  rightPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  panelTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: 3, color: 'var(--text-muted)',
    padding: '12px 16px 8px',
    borderBottom: '1px solid var(--border)',
  },
  filterRow: {
    display: 'flex', flexWrap: 'wrap', gap: 4,
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
  },
  filterBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 9, letterSpacing: 1,
    padding: '4px 8px', cursor: 'pointer',
  },
  filterBtnActive: {
    background: 'var(--surface2)',
    color: 'var(--text)',
  },
  playerList: {
    flex: 1, overflowY: 'auto',
  },
  playerRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  playerRowSelected: {
    background: 'rgba(240,180,41,0.08)',
    borderLeft: '2px solid var(--accent)',
  },
  playerPos: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, fontWeight: 600, minWidth: 28,
  },
  playerName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 15, flex: 1,
  },
  playerMeta: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, color: 'var(--text-muted)',
  },
  playerValue: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, color: 'var(--accent)',
  },
  emptyPool: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)',
    padding: 24, textAlign: 'center',
  },
  otcPanel: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    padding: '0 0 16px',
  },
  otcTeam: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 36, letterSpacing: 4, color: 'var(--text)',
    padding: '12px 16px 4px',
  },
  auctionControls: {
    padding: '8px 16px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  nominatedPlayer: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 14px',
  },
  nominatedPos: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12, fontWeight: 600,
  },
  nominatedName: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 22, letterSpacing: 2,
  },
  bidRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)',
  },
  bidControls: { display: 'flex', alignItems: 'center', gap: 8 },
  bidBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text)',
    fontSize: 18, width: 36, height: 36, cursor: 'pointer',
  },
  bidInput: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 24, textAlign: 'center', width: 80, padding: '4px',
  },
  teamSelectRow: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
  },
  teamSelectBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13, padding: '4px 10px', cursor: 'pointer',
  },
  teamSelectBtnActive: {
    background: 'rgba(240,180,41,0.12)',
    borderColor: 'var(--accent)', color: 'var(--accent)',
  },
  confirmBtn: {
    background: 'rgba(240,180,41,0.2)',
    border: '1px solid var(--accent)',
    borderRadius: 4, color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20, letterSpacing: 3,
    padding: '10px 24px', cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  confirmBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  clearBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: 2,
    padding: '6px 16px', cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  waitingMsg: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11, letterSpacing: 2, color: 'var(--text-muted)',
    padding: '16px 0',
  },
  boardPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  boardScroll: {
    flex: 1, overflow: 'auto',
  },
  board: {
    width: '100%', borderCollapse: 'collapse',
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  boardRdHeader: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)',
    padding: '8px 12px', textAlign: 'center',
    background: 'var(--surface)', position: 'sticky', top: 0,
    borderBottom: '1px solid var(--border)',
    width: 40,
  },
  boardTeamHeader: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)',
    padding: '8px 6px', textAlign: 'center',
    background: 'var(--surface)', position: 'sticky', top: 0,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap', overflow: 'hidden',
  },
  boardRd: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, color: 'var(--text-muted)',
    padding: '4px 8px', textAlign: 'center',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  boardCell: {
    padding: '3px 4px',
    borderBottom: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
    minWidth: 90, maxWidth: 120,
  },
  boardPick: {
    background: 'var(--surface2)',
    borderRadius: 3, padding: '4px 6px',
    display: 'flex', flexDirection: 'column', gap: 1,
  },
  boardPickKeeper: {
    background: 'rgba(240,180,41,0.08)',
  },
  boardPickName: {
    fontSize: 12, fontWeight: 600, color: 'var(--text)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  boardPickBid: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9, color: 'var(--accent)',
  },
  keeperTag: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 8, color: 'var(--accent)',
    background: 'rgba(240,180,41,0.2)',
    borderRadius: 2, padding: '1px 4px',
    alignSelf: 'flex-start',
  },
  boardEmpty: {
    height: 44,
  },
}
