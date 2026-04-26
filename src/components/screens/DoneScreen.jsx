import { useState } from 'react'
import { posColor } from '../../logic/draftLogic'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export default function DoneScreen({ state, onUndoLastPick, onBackToHome, actions }) {
  const { config, teams, players, picks, draftOrder } = state
  const [editPick, setEditPick]         = useState(null)
  const [editBid, setEditBid]           = useState(0)
  const [editPosition, setEditPosition] = useState('')
  const [editTeamIdx, setEditTeamIdx]   = useState(0)

  const orderedTeams = (draftOrder && draftOrder.length > 0
    ? draftOrder.map(i => teams[i])
    : teams
  ).filter(Boolean)

  function getTeamPicks(teamIdx) {
    return picks
      .filter(p => p.teamIdx === teamIdx)
      .sort((a, b) => a.pickNum - b.pickNum)
  }

  function getPlayer(playerId) {
    return players.find(p => p.id === playerId)
  }

  function openEdit(pick) {
    const player = getPlayer(pick.playerId)
    setEditPick(pick)
    setEditBid(pick.bid || 0)
    setEditPosition(pick.overridePosition || player?.position || '')
    setEditTeamIdx(pick.teamIdx)
  }

  function closeEdit() {
    setEditPick(null)
  }

  function handleSaveEdit() {
    if (!editPick) return
    actions.editPick({
      pickNum:    editPick.pickNum,
      bid:        editBid,
      position:   editPosition,
      newTeamIdx: editTeamIdx,
      oldTeamIdx: editPick.teamIdx,
      oldBid:     editPick.bid || 0,
      playerId:   editPick.playerId,
    })
    closeEdit()
  }

  function handleRemovePick() {
    if (!editPick) return
    actions.removePick(editPick.pickNum)
    closeEdit()
  }

  const totalPicks = picks.filter(p => !p.isKeeper).length
  const totalSpent = picks.reduce((s, p) => s + (p.bid || 0), 0)

  return (
    <div style={S.screen}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.draftName}>{config?.draftName || 'DRAFT NIGHT'}</div>
          <div style={S.completeBadge}>✓ DRAFT COMPLETE</div>
        </div>
        <div style={S.headerRight}>
          <div style={S.headerStat}>
            <span style={S.headerStatVal}>{totalPicks}</span>
            <span style={S.headerStatLbl}>TOTAL PICKS</span>
          </div>
          {totalSpent > 0 && (
            <div style={S.headerStat}>
              <span style={S.headerStatVal}>${totalSpent}</span>
              <span style={S.headerStatLbl}>TOTAL SPENT</span>
            </div>
          )}
          <button style={S.undoBtn} onClick={onUndoLastPick}>↩ UNDO LAST PICK</button>
          <button style={S.homeBtn} onClick={onBackToHome}>← HOME</button>
        </div>
      </div>

      {/* Hint */}
      <div style={S.hint}>Click any pick to edit bid, position, or team assignment</div>

      {/* Roster Grid */}
      <div style={S.grid}>
        {orderedTeams.map((team, ti) => {
          const teamIdx  = team.id ?? ti
          const teamPicks = getTeamPicks(teamIdx)
          const spent    = teamPicks.reduce((s, p) => s + (p.bid || 0), 0)
          const remaining = team.budget ?? 0

          return (
            <div key={ti} style={S.teamCard}>
              <div style={S.teamHeader}>
                <div style={S.teamName}>{team.name}</div>
                <div style={S.teamMeta}>
                  {spent > 0 && <span style={S.teamSpent}>${spent} spent</span>}
                  {remaining > 0 && <span style={S.teamRemaining}>${remaining} left</span>}
                  <span style={S.teamCount}>{teamPicks.length} players</span>
                </div>
              </div>
              <div style={S.rosterList}>
                {teamPicks.length === 0 ? (
                  <div style={S.emptyRoster}>No picks</div>
                ) : teamPicks.map((pick, i) => {
                  const player = getPlayer(pick.playerId)
                  if (!player) return null
                  const pos = pick.overridePosition || player.position
                  return (
                    <div key={i} style={S.pickRow} onClick={() => openEdit(pick)}>
                      <span style={{ ...S.pickPos, color: posColor(pos) }}>{pos}</span>
                      <span style={S.pickName}>
                        {player.name}
                        {pick.isKeeper && <span style={S.keeperTag}>K</span>}
                      </span>
                      <span style={S.pickMeta}>{player.nflTeam}</span>
                      {pick.bid > 0 && <span style={S.pickBid}>${pick.bid}</span>}
                      <span style={S.editHint}>✎</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {editPick && (
        <div style={S.overlay} onClick={closeEdit}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>

            <div style={S.modalHeader}>
              <div style={S.modalTitle}>EDIT PICK</div>
              <button style={S.closeBtn} onClick={closeEdit}>✕</button>
            </div>

            <div style={S.playerBanner}>
              <span style={{ ...S.bannerPos, color: posColor(editPosition) }}>{editPosition}</span>
              <span style={S.bannerName}>{getPlayer(editPick.playerId)?.name}</span>
              <span style={S.bannerMeta}>{getPlayer(editPick.playerId)?.nflTeam}</span>
            </div>

            <div style={S.modalBody}>

              {/* Position */}
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>POSITION</label>
                <div style={S.posRow}>
                  {POSITIONS.map(pos => (
                    <button key={pos}
                      style={{
                        ...S.posBtn,
                        ...(editPosition === pos
                          ? { background: `${posColor(pos)}22`, borderColor: posColor(pos), color: posColor(pos) }
                          : {})
                      }}
                      onClick={() => setEditPosition(pos)}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team */}
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>ASSIGNED TEAM</label>
                <div style={S.teamRow}>
                  {teams.map((t, i) => (
                    <button key={i}
                      style={{ ...S.teamBtn, ...(editTeamIdx === i ? S.teamBtnActive : {}) }}
                      onClick={() => setEditTeamIdx(i)}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bid */}
              {editPick.phase === 'auction' && !editPick.isKeeper && (
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>BID AMOUNT</label>
                  <div style={S.bidRow}>
                    <button style={S.bidBtn} onClick={() => setEditBid(b => Math.max(1, b - 10))}>-10</button>
                    <button style={S.bidBtn} onClick={() => setEditBid(b => Math.max(1, b - 1))}>-1</button>
                    <input
                      style={S.bidInput}
                      type="number" min="1"
                      value={editBid}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditBid(parseInt(e.target.value) || 1)}
                    />
                    <button style={S.bidBtn} onClick={() => setEditBid(b => b + 1)}>+1</button>
                    <button style={S.bidBtn} onClick={() => setEditBid(b => b + 10)}>+10</button>
                  </div>
                </div>
              )}

              {editPick.isKeeper && (
                <div style={S.keeperNote}>★ Keeper — bid amount locked</div>
              )}

            </div>

            <div style={S.modalFooter}>
              <button style={S.removeBtn} onClick={handleRemovePick}>🗑 REMOVE PICK</button>
              <div style={S.footerRight}>
                <button style={S.cancelBtn} onClick={closeEdit}>CANCEL</button>
                <button style={S.saveBtn} onClick={handleSaveEdit}>SAVE CHANGES</button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

const S = {
  screen: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 50% 0%, #001a08 0%, var(--bg) 70%)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 32px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)', flexShrink: 0,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 16 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  draftName:   { fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 4, color: 'var(--accent)' },
  completeBadge: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2,
    color: 'var(--green)', background: 'rgba(34,197,94,0.1)',
    border: '1px solid var(--green)', borderRadius: 4, padding: '4px 10px',
  },
  headerStat:    { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  headerStatVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--accent)', lineHeight: 1 },
  headerStatLbl: { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)' },
  undoBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2,
    padding: '6px 14px', cursor: 'pointer',
  },
  homeBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2,
    padding: '6px 14px', cursor: 'pointer',
  },
  hint: {
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
    color: 'var(--text-muted)', textAlign: 'center',
    padding: '10px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16, padding: 24,
  },
  teamCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, overflow: 'hidden',
  },
  teamHeader: {
    padding: '12px 16px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface2)',
  },
  teamName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 2, color: 'var(--text)' },
  teamMeta: { display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  teamSpent:     { fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--accent)' },
  teamRemaining: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--green)' },
  teamCount:     { fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-muted)' },
  rosterList: { padding: '8px 0' },
  emptyRoster: {
    fontFamily: "'DM Mono', monospace", fontSize: 10,
    color: 'var(--text-muted)', padding: '12px 16px',
  },
  pickRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
  },
  pickPos:  { fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, minWidth: 28 },
  pickName: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 600, flex: 1 },
  pickMeta: { fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-muted)' },
  pickBid:  { fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--accent)' },
  editHint: { fontSize: 11, color: 'var(--text-muted)', opacity: 0.4 },
  keeperTag: {
    fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'var(--accent)',
    background: 'rgba(240,180,41,0.2)', borderRadius: 2,
    padding: '1px 4px', marginLeft: 4,
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, width: '100%', maxWidth: 520,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--border)',
  },
  modalTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, color: 'var(--accent)' },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: '4px 8px',
  },
  playerBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 20px', background: 'var(--surface2)',
    borderBottom: '1px solid var(--border)',
  },
  bannerPos:  { fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 },
  bannerName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, flex: 1 },
  bannerMeta: { fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-muted)' },
  modalBody: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldLabel: { fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)' },
  posRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  posBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1,
    padding: '5px 12px', cursor: 'pointer',
  },
  teamRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  teamBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
    padding: '4px 10px', cursor: 'pointer',
  },
  teamBtnActive: {
    background: 'rgba(240,180,41,0.12)',
    borderColor: 'var(--accent)', color: 'var(--accent)',
  },
  bidRow: { display: 'flex', alignItems: 'center', gap: 6 },
  bidBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 3, color: 'var(--text)',
    fontFamily: "'DM Mono', monospace", fontSize: 11,
    padding: '5px 10px', cursor: 'pointer',
  },
  bidInput: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text)',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
    textAlign: 'center', width: 80, padding: '4px',
  },
  keeperNote: {
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1,
    color: 'var(--accent)', background: 'rgba(240,180,41,0.08)',
    border: '1px solid rgba(240,180,41,0.2)', borderRadius: 4, padding: '8px 12px',
  },
  modalFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderTop: '1px solid var(--border)',
  },
  footerRight: { display: 'flex', gap: 8 },
  removeBtn: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)',
    borderRadius: 4, color: 'var(--red)',
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
    padding: '8px 14px', cursor: 'pointer',
  },
  cancelBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
    padding: '8px 14px', cursor: 'pointer',
  },
  saveBtn: {
    background: 'rgba(240,180,41,0.15)', border: '1px solid var(--accent)',
    borderRadius: 4, color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 3,
    padding: '8px 20px', cursor: 'pointer',
  },
}
