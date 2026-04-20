import { useState, useEffect } from 'react'
import { POSITIONS, POS_DEFAULTS, POS_MIN_DEFAULTS } from '../../state/initialState'
import { parseCSV } from '../../logic/parsePlayers'

const NOM_ORDERS  = [{ value: 'serpentine', label: 'SERPENTINE' }, { value: 'fixed', label: 'FIXED' }]
const SERP_STARTS = [{ value: 'serpentine', label: 'SERPENTINE' }, { value: 'fixed', label: 'FIXED' }]

function getDraftMode(totalRounds, auctionRounds) {
  if (auctionRounds <= 0)             return { icon: '🐍', label: 'SERPENTINE DRAFT', color: '#22c55e' }
  if (auctionRounds >= totalRounds)   return { icon: '🔨', label: 'AUCTION DRAFT',    color: '#3b82f6' }
  return                                     { icon: '⚡', label: 'HYBRID DRAFT',     color: '#f0b429' }
}

export default function SetupScreen({ wizardConfig, onStartDraft }) {
const w = wizardConfig || {}

const [draftName, setDraftName]           = useState(w.draftName     || 'DRAFT NIGHT')
const [editingTitle, setEditingTitle]     = useState(false)
const [numTeams, setNumTeams]             = useState(w.numTeams       || 10)
const [totalRounds, setTotalRounds]       = useState(w.totalRounds    || 15)
const [auctionRounds, setAuctionRounds]   = useState(w.auctionRounds  ?? 8)
const [auctionBudget, setAuctionBudget]   = useState(w.auctionBudget  || 200)
const [nomOrder, setNomOrder]             = useState('serpentine')
const [serpStart, setSerpStart]           = useState('serpentine')
const [keepersPerTeam, setKeepersPerTeam] = useState(w.keepersPerTeam || 0)
const [keeperCost, setKeeperCost] = useState(w.keeperCost || 0)
const [teamNames, setTeamNames]           = useState(
  w.teamNames || Array.from({ length: w.numTeams || 10 }, (_, i) => `Team ${i + 1}`)
)
const [keepers, setKeepers]               = useState({})
const [posLimits, setPosLimits]           = useState(w.posLimits    || { ...POS_DEFAULTS })
const [posMinLimits, setPosMinLimits]     = useState(w.posMinLimits || { ...POS_MIN_DEFAULTS })
const [players, setPlayers]               = useState(w.players || [])
const [csvFilename, setCsvFilename]       = useState(w.players?.length > 0 ? '${w.players.length} players loaded from wizard' : '')

useEffect(() => {
  if (!wizardConfig) return
  const w = wizardConfig
  setDraftName(w.draftName || 'DRAFT NIGHT')
  setNumTeams(w.numTeams || 10)
  setTotalRounds(w.totalRounds || 15)
  setAuctionRounds(w.auctionRounds ?? 8)
  setAuctionBudget(w.auctionBudget || 200)
  setKeepersPerTeam(w.keepersPerTeam || 0)
  setKeeperCost(w.keeperCost || 0)
  setPosLimits(w.posLimits || { ...POS_DEFAULTS })
  setPosMinLimits(w.posMinLimits || { ...POS_MIN_DEFAULTS })
  if (w.teamNames) setTeamNames(w.teamNames)
  if (w.players?.length) {
    setPlayers(w.players)
    setCsvFilename(`${w.players.length} players loaded from wizard`)
  }
}, [wizardConfig])

  const serpentineRounds = Math.max(0, totalRounds - auctionRounds)
  const isAuction        = auctionRounds > 0
  const isSerp           = serpentineRounds > 0
  const canStart         = players.length > 0
  const mode             = getDraftMode(totalRounds, auctionRounds)

  const sel = e => e.target.select()

  function handleNumTeamsChange(n) {
    const count = parseInt(n) || 10
    setNumTeams(count)
    setTeamNames(prev => {
      const updated = [...prev]
      while (updated.length < count) updated.push(`Team ${updated.length + 1}`)
      return updated.slice(0, count)
    })
  }

  function handleTotalRoundsChange(val) {
    const n = parseInt(val) || 1
    setTotalRounds(n)
    if (auctionRounds > n) setAuctionRounds(n)
  }

  function handleAuctionRoundsChange(val) {
    const n = Math.max(0, Math.min(parseInt(val) || 0, totalRounds))
    setAuctionRounds(n)
  }

  function handleTeamNameChange(idx, value) {
    setTeamNames(prev => {
      const updated = [...prev]
      updated[idx] = value
      return updated
    })
  }

  function handleKeeperChange(teamIdx, slotIdx, field, value) {
    setKeepers(prev => {
      const key = `${teamIdx}-${slotIdx}`
      const existing = prev[key] || {}
      const updated = { ...existing, [field]: value }
      if (field === 'playerId' && value && !existing.cost) {
        updated.cost = keeperCost
      }
      return { ...prev, [key]: updated }
    })
  }

  function handleCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    setCsvFilename(file.name)
    const reader = new FileReader()
    reader.onload = evt => {
      const parsed = parseCSV(evt.target.result)
      setPlayers(parsed)
    }
    reader.readAsText(file)
  }

function handleStartDraft() {
  const draftType = auctionRounds <= 0 ? 'serpentine' : auctionRounds >= totalRounds ? 'auction' : 'hybrid'
  const config = {
    numTeams, totalRounds, auctionRounds, serpentineRounds,
    draftType, auctionBudget, nomOrder, serpStart,
    keepersPerTeam, posLimits, posMinLimits, draftName,
  }

  const keeperPicks = []

  const teams = teamNames.slice(0, numTeams).map((name, i) => {
    const roster = []
    let budget = auctionBudget

    if (keepersPerTeam > 0 && isAuction) {
      for (let s = 0; s < keepersPerTeam; s++) {
        const k = keepers[`${i}-${s}`]
        if (k?.playerId) {
          const player = players.find(p => p.id === parseInt(k.playerId))
          if (player) {
            const cost = parseInt(k.cost) || 0
            player.drafted = true
            budget -= cost
            roster.push({ ...player, isKeeper: true, keeperCost: cost })
            keeperPicks.push({
              playerId:   player.id,
              playerName: player.name,
              position:   player.position,
              teamIdx:    i,
              bid:        cost,
              phase:      'auction',
              pickNum:    keeperPicks.length + 1,
              isKeeper:   true,
              ts:         Date.now(),
            })
          }
        }
      }
    }

    return { id: i, name, roster, budget, picks: [] }
  })

  onStartDraft({ config, teams, players, keeperPicks })
}

  return (
    <div style={S.screen}>

      {/* Title */}
      <div style={S.logo}>
        {editingTitle ? (
          <input
            style={S.titleInput}
            value={draftName}
            onChange={e => setDraftName(e.target.value.toUpperCase())}
            onBlur={() => setEditingTitle(false)}
            onFocus={sel}
            autoFocus
          />
        ) : (
          <h1 style={S.logoText} onClick={() => setEditingTitle(true)} title="Click to edit">
            {draftName} <span style={S.editHint}>✏️</span>
          </h1>
        )}
        <p style={S.logoSub}>REVIEW & CONFIRM SETTINGS</p>
      </div>

      <div style={S.grid}>

        {/* Rounds + Draft Mode */}
        <div style={S.card}>
          <div style={S.cardTitle}>DRAFT ROUNDS</div>
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>TOTAL ROUNDS</label>
              <input style={S.inputNarrow} type="number" min="1" max="30"
                value={totalRounds} onFocus={sel}
                onChange={e => handleTotalRoundsChange(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>AUCTION ROUNDS</label>
              <input style={S.inputNarrow} type="number" min="0" max={totalRounds}
                value={auctionRounds} onFocus={sel}
                onChange={e => handleAuctionRoundsChange(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>SERPENTINE ROUNDS</label>
              <div style={S.calcField}>{serpentineRounds}</div>
            </div>
            <div style={S.field}>
              <label style={S.label}>&nbsp;</label>
              <div style={{ ...S.modeBadge, background: mode.color + '22', borderColor: mode.color, color: mode.color }}>
                {mode.icon} {mode.label}
              </div>
            </div>
          </div>
        </div>

        {/* League Basics */}
        <div style={S.card}>
          <div style={S.cardTitle}>LEAGUE BASICS</div>
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>TEAMS</label>
              <input style={S.inputNarrow} type="number" min="2" max="20"
                value={numTeams} onFocus={sel}
                onChange={e => handleNumTeamsChange(e.target.value)} />
            </div>
            {isAuction && (
              <div style={S.field}>
                <label style={S.label}>AUCTION BUDGET</label>
                <input style={S.inputNarrow} type="number" min="50" max="1000"
                  value={auctionBudget} onFocus={sel}
                  onChange={e => setAuctionBudget(parseInt(e.target.value) || 200)} />
              </div>
            )}
          </div>
        </div>

        {/* Draft Flow */}
        {(isAuction || isSerp) && (
          <div style={S.card}>
            <div style={S.cardTitle}>DRAFT FLOW</div>
            <div style={S.row}>
              {isAuction && (
                <div style={S.field}>
                  <label style={S.label}>NOMINATION ORDER</label>
                  <div style={S.btnGroup}>
                    {NOM_ORDERS.map(({ value, label }) => (
                      <button key={value}
                        style={{ ...S.toggleBtn, ...(nomOrder === value ? S.toggleBtnActive : {}) }}
                        onClick={() => setNomOrder(value)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isSerp && (
                <div style={S.field}>
                  <label style={S.label}>SERPENTINE START</label>
                  <div style={S.btnGroup}>
                    {SERP_STARTS.map(({ value, label }) => (
                      <button key={value}
                        style={{ ...S.toggleBtn, ...(serpStart === value ? S.toggleBtnActive : {}) }}
                        onClick={() => setSerpStart(value)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Names */}
        <div style={S.card}>
          <div style={S.cardTitle}>TEAM NAMES</div>
          <div style={S.teamGrid}>
            {teamNames.slice(0, numTeams).map((name, i) => (
              <div key={i} style={S.field}>
                <label style={S.label}>TEAM {i + 1}</label>
                <input style={S.inputWide} type="text" value={name} onFocus={sel}
                  onChange={e => handleTeamNameChange(i, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Position Limits */}
        <div style={S.card}>
          <div style={S.cardTitle}>POSITION LIMITS</div>
          <div style={S.posGrid}>
            <div style={S.posHeader} />
            <div style={S.posHeader}>MIN</div>
            <div style={S.posHeader}>MAX</div>
            {POSITIONS.map(pos => (
              <>
                <div key={pos} style={{ ...S.posLabel, color: `var(--pos-${pos.toLowerCase()})` }}>{pos}</div>
                <input key={`min-${pos}`} style={S.posInput} type="number" min="0" max="20"
                  value={posMinLimits[pos] || 0} onFocus={sel}
                  onChange={e => setPosMinLimits(prev => ({ ...prev, [pos]: parseInt(e.target.value) || 0 }))} />
                <input key={`max-${pos}`} style={S.posInput} type="number" min="0" max="20"
                  value={posLimits[pos] || 0} onFocus={sel}
                  onChange={e => setPosLimits(prev => ({ ...prev, [pos]: parseInt(e.target.value) || 0 }))} />
              </>
            ))}
          </div>
        </div>

        {/* Keepers */}
        {isAuction && (
          <div style={S.card}>
            <div style={S.cardTitle}>KEEPERS</div>
            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>KEEPERS PER TEAM</label>
                <input style={S.inputNarrow} type="number" min="0" max="10"
                  value={keepersPerTeam} onFocus={sel}
                  onChange={e => setKeepersPerTeam(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            {keepersPerTeam > 0 && players.length === 0 && (
              <p style={S.hint}>← Upload players first to assign keepers</p>
            )}
            {keepersPerTeam > 0 && players.length > 0 && (
              <div style={S.keeperGrid}>
                {teamNames.slice(0, numTeams).map((name, ti) => (
                  <div key={ti} style={S.keeperTeam}>
                    <div style={S.keeperTeamName}>{name}</div>
                    {Array.from({ length: keepersPerTeam }, (_, si) => (
                      <div key={si} style={S.keeperRow}>
                        <select style={S.keeperSelect}
                          value={keepers[`${ti}-${si}`]?.playerId || ''}
                          onChange={e => handleKeeperChange(ti, si, 'playerId', e.target.value)}>
                          <option value=''>— Select —</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                          ))}
                        </select>
                        <input style={S.keeperCost} type="number" min="0"
                          placeholder="$" onFocus={sel}
                          value={keepers[`${ti}-${si}`]?.cost || ''}
                          onChange={e => handleKeeperChange(ti, si, 'cost', e.target.value)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Players */}
        <div style={S.card}>
          <div style={S.cardTitle}>PLAYERS</div>
          <label style={S.uploadBtn}>
            UPLOAD CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
          </label>
          {csvFilename && (
            <p style={S.csvName}>✓ {csvFilename} — {players.length} players loaded</p>
          )}
        </div>

      </div>

      <button
        style={{ ...S.startBtn, ...(canStart ? {} : S.startBtnDisabled) }}
        disabled={!canStart}
        onClick={handleStartDraft}>
        START DRAFT
      </button>
    </div>
  )
}

const S = {
  screen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px 80px',
    background: 'radial-gradient(ellipse at 50% 0%, #1a1200 0%, var(--bg) 70%)',
  },
  logo: { textAlign: 'center', marginBottom: 40 },
  logoText: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 'clamp(56px, 10vw, 96px)',
    letterSpacing: 8,
    color: 'var(--accent)',
    lineHeight: 1,
    cursor: 'pointer',
  },
  editHint: { fontSize: 24, opacity: 0.4, verticalAlign: 'middle' },
  titleInput: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid var(--accent)',
    color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 'clamp(56px, 10vw, 96px)',
    letterSpacing: 8,
    textAlign: 'center',
    outline: 'none',
    width: '100%',
  },
  logoSub: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 4,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  grid: { width: '100%', maxWidth: 900, display: 'grid', gap: 24 },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 24,
  },
  cardTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 3,
    color: 'var(--text-muted)',
    marginBottom: 16,
  },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: 2,
    color: 'var(--text-muted)',
  },
  inputNarrow: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 16,
    padding: '8px 12px',
    width: 90,
    textAlign: 'center',
  },
  inputWide: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 16,
    padding: '8px 12px',
    width: '100%',
  },
  calcField: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 16,
    padding: '8px 12px',
    width: 90,
    textAlign: 'center',
  },
  modeBadge: {
    border: '1px solid',
    borderRadius: 4,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    padding: '8px 16px',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },
  btnGroup: { display: 'flex', gap: 8 },
  toggleBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: 2,
    padding: '6px 12px',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: 'rgba(240,180,41,0.12)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  posGrid: {
    display: 'grid',
    gridTemplateColumns: '60px 80px 80px',
    gap: 8,
    alignItems: 'center',
  },
  posHeader: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: 2,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  posLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    fontWeight: 600,
  },
  posInput: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    fontSize: 14,
    padding: '6px 8px',
    textAlign: 'center',
    width: '100%',
  },
  keeperGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
    marginTop: 16,
  },
  keeperTeam: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: 12,
  },
  keeperTeamName: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: 2,
    color: 'var(--accent)',
    marginBottom: 10,
  },
  keeperRow: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  keeperSelect: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 14,
    padding: '6px 8px',
    flex: 1,
  },
  keeperCost: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 14,
    padding: '6px 8px',
    width: 60,
    textAlign: 'center',
  },
  uploadBtn: {
    display: 'inline-block',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  csvName: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: 'var(--green)',
    marginTop: 12,
  },
  hint: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 12,
  },
  startBtn: {
    marginTop: 40,
    background: 'rgba(240,180,41,0.2)',
    border: '1px solid var(--accent)',
    borderRadius: 4,
    color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 24,
    letterSpacing: 4,
    padding: '16px 64px',
    cursor: 'pointer',
  },
  startBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
}
