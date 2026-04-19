import { POSITIONS } from '../state/initialState'

export function getSerpentineOrder(draftOrder, round) {
  return round % 2 === 0
    ? [...draftOrder].reverse()
    : [...draftOrder]
}

export function checkPositionLimit(team, position, config) {
  if (!config?.posLimits) return true
  const limit = config.posLimits[position]
  if (!limit) return true
  const count = team.roster.filter(p => p.position === position).length
  return count < limit
}

export function checkPositionMin(team, position, config) {
  if (!config?.posMinLimits) return true
  const min = config.posMinLimits[position] || 0
  const count = team.roster.filter(p => p.position === position).length
  return count < min
}

export function isRosterFull(team, config) {
  if (!config?.rosterSize) return false
  return team.roster.length >= config.rosterSize
}

export function getAvailablePlayers(players, filterPos = 'ALL') {
  return players.filter(p => {
    if (p.drafted) return false
    if (filterPos === 'ALL') return true
    return p.position === filterPos
  })
}

export function getNominatorTeamIdx(draftOrder, nomIdx) {
  return draftOrder[nomIdx % draftOrder.length]
}

export function isAuctionComplete(teams, config) {
  if (!config?.auctionRounds) return false
  return teams.every(team => {
    const auctionPicks = team.roster.filter(p => !p.isKeeper).length
    return auctionPicks >= config.auctionRounds
  })
}

export function formatCurrency(amount) {
  return `$${amount}`
}

export function posColor(position) {
  const colors = {
    QB: '#e53935',
    RB: '#43a047',
    WR: '#1e88e5',
    TE: '#fb8c00',
    K: '#8e24aa',
    DEF: '#00acc1',
  }
  return colors[position] || '#888'
}