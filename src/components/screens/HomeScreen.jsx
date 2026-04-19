import { useEffect, useState } from 'react'
import { getDrafts, deleteDraft } from '../../data/draftService'

export default function HomeScreen({ onNewDraft, onLoadDraft }) {
  const [drafts, setDrafts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  async function fetchDrafts() {
    setLoading(true)
    const records = await getDrafts()
    setDrafts(records)
    setLoading(false)
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this draft? This cannot be undone.')) return
    setDeleting(id)
    await deleteDraft(id)
    await fetchDrafts()
    setDeleting(null)
  }

  const active   = drafts.filter(d => d.status === 'active')
  const complete = drafts.filter(d => d.status === 'complete')

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <div style={S.logo}>
          <h1 style={S.logoText}>DRAFT NIGHT</h1>
          <p style={S.logoSub}>WOOLTEETH FANTASY DRAFT MANAGER</p>
        </div>
        <button style={S.newBtn} onClick={onNewDraft}>
          + NEW DRAFT
        </button>
      </div>

      <div style={S.content}>
        {loading ? (
          <div style={S.empty}>LOADING DRAFTS...</div>
        ) : drafts.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>🏈</div>
            <div style={S.emptyTitle}>NO DRAFTS YET</div>
            <div style={S.emptyDesc}>Create your first draft to get started</div>
            <button style={S.emptyBtn} onClick={onNewDraft}>+ NEW DRAFT</button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>ACTIVE DRAFTS</div>
                <div style={S.draftGrid}>
                  {active.map(draft => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onLoad={() => onLoadDraft(draft.id)}
                      onDelete={e => handleDelete(e, draft.id)}
                      deleting={deleting === draft.id}
                    />
                  ))}
                </div>
              </div>
            )}
            {complete.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>COMPLETED DRAFTS</div>
                <div style={S.draftGrid}>
                  {complete.map(draft => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onLoad={() => onLoadDraft(draft.id)}
                      onDelete={e => handleDelete(e, draft.id)}
                      deleting={deleting === draft.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DraftCard({ draft, onLoad, onDelete, deleting }) {
  const config   = draft.config || {}
  const teams    = draft.teams  || []
  const picks    = draft.picks  || []
  const created  = new Date(draft.created).toLocaleDateString()
  const modeIcon = config.draftType === 'serpentine' ? '🐍' :
                   config.draftType === 'auction'    ? '🔨' : '⚡'

  return (
    <div style={S.card} onClick={onLoad}>
      <div style={S.cardTop}>
        <div style={S.cardName}>{draft.name || 'Untitled Draft'}</div>
        <div style={{
          ...S.statusBadge,
          background: draft.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
          color:      draft.status === 'active' ? '#22c55e' : '#6b7280',
          borderColor:draft.status === 'active' ? '#22c55e' : '#6b7280',
        }}>
          {draft.status === 'active' ? 'ACTIVE' : 'COMPLETE'}
        </div>
      </div>
      <div style={S.cardMeta}>
        <span>{modeIcon} {(config.draftType || 'draft').toUpperCase()}</span>
        <span>👥 {teams.length} TEAMS</span>
        <span>🎯 {picks.length} PICKS</span>
      </div>
      <div style={S.cardFooter}>
        <span style={S.cardDate}>{created}</span>
        <button
          style={S.deleteBtn}
          onClick={onDelete}
          disabled={deleting}>
          {deleting ? '...' : '🗑'}
        </button>
      </div>
    </div>
  )
}

const S = {
  screen: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 50% 0%, #1a1200 0%, var(--bg) 70%)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '32px 48px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {},
  logoText: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 48,
    letterSpacing: 6,
    color: 'var(--accent)',
    lineHeight: 1,
  },
  logoSub: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: 3,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  newBtn: {
    background: 'rgba(240,180,41,0.15)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20,
    letterSpacing: 3,
    padding: '12px 32px',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    padding: '40px 48px',
  },
  section: { marginBottom: 48 },
  sectionTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 3,
    color: 'var(--text-muted)',
    marginBottom: 16,
  },
  draftGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 20,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardName: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 22,
    letterSpacing: 2,
    color: 'var(--text)',
    flex: 1,
  },
  statusBadge: {
    border: '1px solid',
    borderRadius: 99,
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    padding: '3px 10px',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'flex',
    gap: 16,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 16,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    opacity: 0.5,
    padding: '4px 8px',
  },
  empty: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: 'var(--text-muted)',
    letterSpacing: 2,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 16,
  },
  emptyIcon: { fontSize: 64 },
  emptyTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 32,
    letterSpacing: 4,
    color: 'var(--text-muted)',
  },
  emptyDesc: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: 'var(--text-muted)',
    letterSpacing: 2,
  },
  emptyBtn: {
    background: 'rgba(240,180,41,0.15)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    color: 'var(--accent)',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20,
    letterSpacing: 3,
    padding: '12px 32px',
    cursor: 'pointer',
    marginTop: 8,
  },
}