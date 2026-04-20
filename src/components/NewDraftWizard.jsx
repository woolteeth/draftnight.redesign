import { useState } from 'react'
import { parseCSV } from '../logic/parsePlayers'

const STEPS = ['type', 'teams', 'rounds', 'positions', 'keepers', 'source', 'names']

const STEP_TITLES = {
  type:      'HOW DOES YOUR DRAFT WORK?',
  teams:     'HOW MANY TEAMS?',
  rounds:    'ROUND STRUCTURE',
  positions: 'ROSTER REQUIREMENTS',
  keepers:   'KEEPER SETTINGS',
  source:    'PLAYER SOURCE',
  names:     'TEAM NAMES & ORDER',
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

const API_SOURCES = [
  { value: 'espn',       label: 'ESPN',       icon: '🏈', soon: true },
  { value: 'draftpros',  label: 'DRAFT PROS', icon: '📊', soon: true },
  { value: 'draftkings', label: 'DRAFTKINGS', icon: '👑', soon: true },
]

export default function NewDraftWizard({ onComplete, onCancel, onSkip }) {
  const [step, setStep]                     = useState(0)
  const [draftType, setDraftType]           = useState(null)
  const [numTeams, setNumTeams]             = useState(10)
  const [totalRounds, setTotalRounds]       = useState(15)
  const [auctionRounds, setAuctionRounds]   = useState(8)
  const [budget, setBudget]                 = useState(200)
  const [nomOrder, setNomOrder]             = useState('serpentine')
  const [serpOrder, setSerpOrder]           = useState('serpentine')
  const [posLimits, setPosLimits]           = useState({ QB:3, RB:6, WR:6, TE:2, K:1, DEF:1 })
  const [posMinLimits, setPosMinLimits]     = useState({ QB:1, RB:2, WR:2, TE:1, K:1, DEF:1 })
  const [hasKeepers, setHasKeepers]         = useState(null)
  const [keepersPerTeam, setKeepersPerTeam] = useState(1)
  const [hasKeeperCost, setHasKeeperCost]   = useState(null)
  const [keeperCost, setKeeperCost]         = useState(0)
  const [playerSource, setPlayerSource]     = useState(null)
  const [players, setPlayers]               = useState([])
  const [csvFilename, setCsvFilename]       = useState('')
  const [teamNames, setTeamNames]           = useState(
    Array.from({ length: 10 }, (_, i) => `Team ${i + 1}`)
  )

  const sel              = e => e.target.select()
  const serpentineRounds = Math.max(0, totalRounds - auctionRounds)
  const isAuction        = draftType === 'auction' || draftType === 'combination'
  const isStandard       = draftType === 'standard' || draftType === 'combination'
  const currentStep      = STEPS[step]
  const isFirst          = step === 0
  const isLast           = step === STEPS.length - 1

  function handleTypeToggle(value) {
    if (draftType === null) {
      setDraftType(value)
    } else if (draftType === value) {
      setDraftType(null)
    } else if (draftType === 'combination') {
      setDraftType(value === 'auction' ? 'standard' : 'auction')
    } else {
      setDraftType('combination')
    }
  }

  function isTypeSelected(value) {
    if (draftType === 'combination') return true
    return draftType === value
  }

  function handleNumTeamsChange(n) {
    const count = Math.max(2, Math.min(20, parseInt(n) || 2))
    setNumTeams(count)
    setTeamNames(prev => {
      const updated = [...prev]
      while (updated.length < count) updated.push(`Team ${updated.length + 1}`)
      return updated.slice(0, count)
    })
  }

  function handleTeamNameChange(idx, value) {
    setTeamNames(prev => {
      const updated = [...prev]
      updated[idx] = value
      return updated
    })
  }

  function handleRandomizeOrder() {
    setTeamNames(prev => {
      const slice = prev.slice(0, numTeams)
      const shuffled = [...slice].sort(() => Math.random() - 0.5)
      return shuffled
    })
  }

  function handleCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    setCsvFilename(file.name)
    setPlayerSource('csv')
    const reader = new FileReader()
    reader.onload = evt => {
      const parsed = parseCSV(evt.target.result)
      setPlayers(parsed)
    }
    reader.readAsText(file)
  }

  function canAdvance() {
    if (currentStep === 'type')    return draftType !== null
    if (currentStep === 'source')  return players.length > 0
    if (currentStep === 'keepers') {
      if (hasKeepers === null)  return false
      if (hasKeepers === false) return true
      if (!isAuction)           return true
      return hasKeeperCost !== null
    }
    return true
  }

  function handleNext() {
    if (!canAdvance()) return
    if (isLast) handleComplete()
    else setStep(s => s + 1)
  }

  function handleComplete() {
    const resolvedType          = draftType === 'standard' ? 'serpentine' : draftType === 'auction' ? 'auction' : 'hybrid'
    const resolvedAuctionRounds = draftType === 'standard' ? 0 : draftType === 'auction' ? totalRounds : auctionRounds

    onComplete({
      draftName:        'DRAFT NIGHT',
      draftType:        resolvedType,
      numTeams,
      totalRounds,
      auctionRounds:    resolvedAuctionRounds,
      serpentineRounds: Math.max(0, totalRounds - resolvedAuctionRounds),
      auctionBudget:    budget,
      nomOrder,
      serpOrder,
      posLimits,
      posMinLimits,
      hasKeepers:       hasKeepers || false,
      keepersPerTeam:   hasKeepers ? keepersPerTeam : 0,
      keeperCost:       hasKeepers && hasKeeperCost ? keeperCost : 0,
      playerSource,
      players,
      teamNames:        teamNames.slice(0, numTeams),
    })
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.stepIndicator}>
            {STEPS.map((s, i) => (
              <div key={s} style={{
                ...S.stepDot,
                ...(i === step ? S.stepDotActive : {}),
                ...(i < step   ? S.stepDotDone  : {}),
              }} />
            ))}
          </div>
          <div style={S.headerRight}>
            <button style={S.skipBtn} onClick={onSkip}>SKIP TO SETTINGS</button>
            <button style={S.closeBtn} onClick={onCancel}>✕</button>
          </div>
        </div>

        {/* Title */}
        <div style={S.title}>{STEP_TITLES[currentStep]}</div>

        {/* Content */}
        <div style={S.content}>

          {/* STEP 1: Type */}
          {currentStep === 'type' && (
            <div style={S.typeLayout}>
              <div style={S.typeSubtitle}>Select both for a hybrid draft</div>
              <div style={S.typeRow}>
                {[
                  { value: 'auction',  icon: '🔨', label: 'AUCTION',  desc: 'Players are nominated and bid on' },
                  { value: 'standard', icon: '🐍', label: 'STANDARD', desc: 'Teams pick in snake order' },
                ].map(({ value, icon, label, desc }) => (
                  <div key={value}
                    style={{ ...S.typeCard, ...(isTypeSelected(value) ? S.typeCardActive : {}) }}
                    onClick={() => handleTypeToggle(value)}>
                    <div style={S.typeIcon}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={S.typeLabel}>{label}</div>
                      <div style={S.typeDesc}>{desc}</div>
                    </div>
                    <div>
                      {isTypeSelected(value)
                        ? <div style={S.checkOn}>✓</div>
                        : <div style={S.checkOff} />
                      }
                    </div>
                  </div>
                ))}
              </div>
              {draftType === 'combination' && (
                <div style={S.hybridNote}>
                  ⚡ Hybrid draft — auction rounds first, then snake
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Teams */}
          {currentStep === 'teams' && (
            <div style={S.centerField}>
              <div style={S.bigNumber}>
                <button style={S.stepper} onClick={() => handleNumTeamsChange(numTeams - 1)}>−</button>
                <input style={S.bigInput} type="number" min="2" max="20"
                  value={numTeams} onFocus={sel}
                  onChange={e => handleNumTeamsChange(e.target.value)} />
                <button style={S.stepper} onClick={() => handleNumTeamsChange(numTeams + 1)}>+</button>
              </div>
              <div style={S.fieldHint}>TEAMS IN YOUR LEAGUE</div>
            </div>
          )}

          {/* STEP 3: Rounds */}
          {currentStep === 'rounds' && (
            <div style={S.roundsLayout}>
              <div style={S.roundField}>
                <div style={S.roundLabel}>TOTAL ROUNDS</div>
                <div style={S.bigNumber}>
                  <button style={S.stepper} onClick={() => setTotalRounds(r => Math.max(1, r - 1))}>−</button>
                  <input style={S.bigInput} type="number" min="1" max="30"
                    value={totalRounds} onFocus={sel}
                    onChange={e => setTotalRounds(parseInt(e.target.value) || 1)} />
                  <button style={S.stepper} onClick={() => setTotalRounds(r => r + 1)}>+</button>
                </div>
                <div style={S.fieldHint}>PLAYERS PER TEAM</div>
              </div>

              {draftType === 'combination' && (
                <>
                  <div style={S.roundDivider}>SPLIT</div>
                  <div style={S.roundField}>
                    <div style={S.roundLabel}>AUCTION ROUNDS</div>
                    <div style={S.bigNumber}>
                      <button style={S.stepper} onClick={() => setAuctionRounds(r => Math.max(0, r - 1))}>−</button>
                      <input style={S.bigInput} type="number" min="0" max={totalRounds}
                        value={auctionRounds} onFocus={sel}
                        onChange={e => setAuctionRounds(Math.min(parseInt(e.target.value) || 0, totalRounds))} />
                      <button style={S.stepper} onClick={() => setAuctionRounds(r => Math.min(r + 1, totalRounds))}>+</button>
                    </div>
                    <div style={S.fieldHint}>THEN {serpentineRounds} SNAKE ROUNDS</div>
                  </div>
                </>
              )}

              {isAuction && (
                <div style={S.roundField}>
                  <div style={S.roundLabel}>AUCTION BUDGET</div>
                  <div style={S.bigNumber}>
                    <button style={S.stepper} onClick={() => setBudget(b => Math.max(5, b - 5))}>−</button>
                    <input style={S.bigInput} type="number" min="5" max="9999"
                      value={budget} onFocus={sel}
                      onChange={e => setBudget(parseInt(e.target.value) || 200)} />
                    <button style={S.stepper} onClick={() => setBudget(b => b + 5)}>+</button>
                  </div>
                  <div style={S.fieldHint}>DOLLARS PER TEAM</div>
                </div>
              )}

              {/* Order Settings */}
              <div style={S.orderSection}>
                {isAuction && (
                  <div style={S.orderField}>
                    <div style={S.orderLabel}>NOMINATION ORDER</div>
                    <div style={S.btnGroup}>
                      {[{ value: 'serpentine', label: 'SERPENTINE' }, { value: 'fixed', label: 'FIXED' }].map(({ value, label }) => (
                        <button key={value}
                          style={{ ...S.toggleBtn, ...(nomOrder === value ? S.toggleBtnActive : {}) }}
                          onClick={() => setNomOrder(value)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isStandard && (
                  <div style={S.orderField}>
                    <div style={S.orderLabel}>PICK ORDER</div>
                    <div style={S.btnGroup}>
                      {[{ value: 'serpentine', label: 'SERPENTINE' }, { value: 'fixed', label: 'FIXED' }].map(({ value, label }) => (
                        <button key={value}
                          style={{ ...S.toggleBtn, ...(serpOrder === value ? S.toggleBtnActive : {}) }}
                          onClick={() => setSerpOrder(value)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Positions */}
          {currentStep === 'positions' && (
            <div>
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
              <p style={S.hint}>These can be adjusted later in settings</p>
            </div>
          )}

          {/* STEP 5: Keepers */}
          {currentStep === 'keepers' && (
            <div style={S.keeperLayout}>
              <div style={S.question}>DOES YOUR LEAGUE USE KEEPERS?</div>
              <div style={S.yesNoRow}>
                <button style={{ ...S.yesNoBtn, ...(hasKeepers === true  ? S.yesNoBtnActive : {}) }}
                  onClick={() => setHasKeepers(true)}>YES</button>
                <button style={{ ...S.yesNoBtn, ...(hasKeepers === false ? S.yesNoBtnActive : {}) }}
                  onClick={() => { setHasKeepers(false); setHasKeeperCost(null) }}>NO</button>
              </div>

              {hasKeepers === true && (
                <div style={S.keeperSection}>
                  <div style={S.question}>HOW MANY KEEPERS PER TEAM?</div>
                  <div style={S.bigNumber}>
                    <button style={S.stepper} onClick={() => setKeepersPerTeam(k => Math.max(1, k - 1))}>−</button>
                    <input style={S.bigInput} type="number" min="1" max="10"
                      value={keepersPerTeam} onFocus={sel}
                      onChange={e => setKeepersPerTeam(parseInt(e.target.value) || 1)} />
                    <button style={S.stepper} onClick={() => setKeepersPerTeam(k => k + 1)}>+</button>
                  </div>
                </div>
              )}

              {hasKeepers === true && isAuction && (
                <div style={S.keeperSection}>
                  <div style={S.question}>IS THERE A SET COST TO KEEP A PLAYER?</div>
                  <div style={S.yesNoRow}>
                    <button style={{ ...S.yesNoBtn, ...(hasKeeperCost === true  ? S.yesNoBtnActive : {}) }}
                      onClick={() => setHasKeeperCost(true)}>YES</button>
                    <button style={{ ...S.yesNoBtn, ...(hasKeeperCost === false ? S.yesNoBtnActive : {}) }}
                      onClick={() => setHasKeeperCost(false)}>NO</button>
                  </div>

                  {hasKeeperCost === true && (
                    <div style={S.keeperSection}>
                      <div style={S.fieldHint}>DEFAULT KEEPER COST</div>
                      <div style={S.bigNumber}>
                        <button style={S.stepper} onClick={() => setKeeperCost(k => Math.max(0, k - 5))}>−</button>
                        <input style={S.bigInput} type="number" min="0"
                          value={keeperCost} onFocus={sel}
                          onChange={e => setKeeperCost(parseInt(e.target.value) || 0)} />
                        <button style={S.stepper} onClick={() => setKeeperCost(k => k + 5)}>+</button>
                      </div>
                      <p style={S.hint}>Pre-filled for all keepers. Override per player on the confirmation screen.</p>
                    </div>
                  )}
                </div>
              )}

              {hasKeepers === true && !isAuction && (
                <p style={{ ...S.hint, marginTop: 16 }}>Keeper costs apply to auction and combination drafts only.</p>
              )}
              {hasKeepers === false && (
                <p style={{ ...S.hint, marginTop: 24 }}>All players enter the draft fresh.</p>
              )}
            </div>
          )}

          {/* STEP 6: Source */}
          {currentStep === 'source' && (
            <div style={S.sourceLayout}>
              <div style={{ ...S.sourceCard, ...(playerSource === 'csv' ? S.sourceCardActive : {}) }}>
                <div style={S.sourceCardTop}>
                  <div style={S.sourceIcon}>📄</div>
                  <div>
                    <div style={S.sourceLabel}>CSV FILE</div>
                    <div style={S.sourceDesc}>Upload a formatted player rankings file</div>
                  </div>
                  <label style={S.uploadBtn}>
                    {csvFilename ? '✓ CHANGE FILE' : 'UPLOAD CSV'}
                    <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />
                  </label>
                </div>
                {csvFilename && (
                  <div style={S.csvConfirm}>✓ {csvFilename} — {players.length} players loaded</div>
                )}
              </div>

              <div style={S.soonHeader}>LIVE RANKINGS — COMING SOON</div>
              {API_SOURCES.map(({ value, label, icon }) => (
                <div key={value} style={S.sourceCardSoon}>
                  <div style={S.sourceCardTop}>
                    <div style={S.sourceIcon}>{icon}</div>
                    <div>
                      <div style={S.sourceLabelSoon}>{label}</div>
                      <div style={S.sourceDesc}>Live rankings via API</div>
                    </div>
                    <div style={S.soonTag}>COMING SOON</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 7: Names */}
          {currentStep === 'names' && (
            <div>
              <div style={S.namesHeader}>
                <div style={S.hint}>Draft order follows team order — 1 picks first</div>
                <button style={S.randomBtn} onClick={handleRandomizeOrder}>
                  🎲 RANDOMIZE ORDER
                </button>
              </div>
              <div style={S.namesGrid}>
                {teamNames.slice(0, numTeams).map((name, i) => (
                  <div key={i} style={S.nameField}>
                    <label style={S.nameLabel}>{i + 1}</label>
                    <input style={S.nameInput} type="text" value={name} onFocus={sel}
                      onChange={e => handleTeamNameChange(i, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={S.footer}>
          {!isFirst
            ? <button style={S.backBtn} onClick={() => setStep(s => s - 1)}>← BACK</button>
            : <div />
          }
          <button
            style={{ ...S.nextBtn, ...(!canAdvance() ? S.nextBtnDisabled : {}) }}
            disabled={!canAdvance()}
            onClick={handleNext}>
            {isLast ? 'CONFIRM SETTINGS →' : 'NEXT →'}
          </button>
        </div>

      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    width: '100%', maxWidth: 640, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  stepIndicator: { display: 'flex', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--border)' },
  stepDotActive: { background: 'var(--accent)', width: 24, borderRadius: 4 },
  stepDotDone:   { background: 'var(--text-muted)' },
  headerRight:   { display: 'flex', alignItems: 'center', gap: 12 },
  skipBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 9, letterSpacing: 2, padding: '6px 12px', cursor: 'pointer',
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: '4px 8px',
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 32, letterSpacing: 4,
    color: 'var(--accent)', padding: '16px 24px 8px',
  },
  content: { flex: 1, padding: '16px 24px', overflowY: 'auto' },
  typeLayout:   { display: 'flex', flexDirection: 'column', gap: 16 },
  typeSubtitle: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)' },
  typeRow:      { display: 'flex', flexDirection: 'column', gap: 12 },
  typeCard: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '16px 20px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
  },
  typeCardActive: { background: 'rgba(240,180,41,0.1)', borderColor: 'var(--accent)' },
  typeIcon:  { fontSize: 28, minWidth: 36 },
  typeLabel: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, color: 'var(--text)' },
  typeDesc:  { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.4 },
  checkOn: {
    width: 24, height: 24, borderRadius: '50%',
    background: 'var(--accent)', color: '#000', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
  },
  checkOff: { width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)' },
  hybridNote: {
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--accent)',
    background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)',
    borderRadius: 6, padding: '10px 14px',
  },
  centerField: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '32px 0', gap: 12,
  },
  bigNumber: { display: 'flex', alignItems: 'center', gap: 16 },
  bigInput: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 64, letterSpacing: 4, textAlign: 'center', width: 160, padding: '8px 0',
  },
  stepper: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text)',
    fontSize: 24, width: 44, height: 44, cursor: 'pointer',
  },
  fieldHint: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, color: 'var(--text-muted)' },
  roundsLayout: {
    display: 'flex', gap: 24, flexWrap: 'wrap',
    alignItems: 'flex-start', justifyContent: 'center', padding: '16px 0',
  },
  roundField: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  roundLabel: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3, color: 'var(--text-muted)' },
  roundDivider: {
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 3,
    color: 'var(--text-muted)', alignSelf: 'center', paddingTop: 32,
  },
  orderSection: {
    width: '100%', display: 'flex', gap: 32, flexWrap: 'wrap',
    borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 8,
  },
  orderField: { display: 'flex', flexDirection: 'column', gap: 8 },
  orderLabel: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)' },
  btnGroup: { display: 'flex', gap: 8 },
  toggleBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: 2, padding: '6px 12px', cursor: 'pointer',
  },
  toggleBtnActive: { background: 'rgba(240,180,41,0.12)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  posGrid: { display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10, alignItems: 'center', maxWidth: 320 },
  posHeader: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)', textAlign: 'center' },
  posLabel:  { fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600 },
  posInput: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text)',
    fontSize: 16, padding: '8px', textAlign: 'center', width: '100%',
  },
  keeperLayout: { display: 'flex', flexDirection: 'column', gap: 8 },
  keeperSection: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginTop: 24 },
  question: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: 'var(--text-dim)' },
  yesNoRow: { display: 'flex', gap: 12 },
  yesNoBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text-muted)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20, letterSpacing: 3, padding: '10px 32px', cursor: 'pointer',
  },
  yesNoBtnActive: { background: 'rgba(240,180,41,0.12)', borderColor: 'var(--accent)', color: 'var(--accent)' },
  hint: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, color: 'var(--text-muted)', lineHeight: 1.6 },
  sourceLayout: { display: 'flex', flexDirection: 'column', gap: 12 },
  sourceCard: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '16px 20px',
  },
  sourceCardActive: { background: 'rgba(240,180,41,0.08)', borderColor: 'var(--accent)' },
  sourceCardSoon: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '16px 20px', opacity: 0.45,
  },
  sourceCardTop: { display: 'flex', alignItems: 'center', gap: 16 },
  sourceIcon: { fontSize: 28, minWidth: 36 },
  sourceLabel:     { fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: 'var(--text)' },
  sourceLabelSoon: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: 'var(--text-muted)' },
  sourceDesc: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: 'var(--text-muted)', marginTop: 2 },
  uploadBtn: {
    marginLeft: 'auto', display: 'inline-block',
    background: 'rgba(240,180,41,0.12)', border: '1px solid var(--accent)',
    borderRadius: 4, color: 'var(--accent)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: 2, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  csvConfirm: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--green)', marginTop: 12, letterSpacing: 1,
  },
  soonHeader: {
    fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: 'var(--text-muted)', marginTop: 8,
  },
  soonTag: {
    marginLeft: 'auto', fontFamily: "'DM Mono', monospace",
    fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)',
    border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', whiteSpace: 'nowrap',
  },
  namesHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  randomBtn: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 10, letterSpacing: 2, padding: '8px 14px', cursor: 'pointer',
  },
  namesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  nameField: { display: 'flex', alignItems: 'center', gap: 10 },
  nameLabel: { fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-muted)', minWidth: 20, textAlign: 'right' },
  nameInput: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text)',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 16, padding: '8px 12px', flex: 1,
  },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 24px', borderTop: '1px solid var(--border)',
  },
  backBtn: {
    background: 'transparent', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-muted)',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11, letterSpacing: 2, padding: '10px 20px', cursor: 'pointer',
  },
  nextBtn: {
    background: 'rgba(240,180,41,0.15)', border: '1px solid var(--accent)',
    borderRadius: 4, color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20, letterSpacing: 3, padding: '10px 32px', cursor: 'pointer', marginLeft: 'auto',
  },
  nextBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
}
