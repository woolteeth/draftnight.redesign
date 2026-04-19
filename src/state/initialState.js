export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

export const POS_DEFAULTS = {
  QB: 3, RB: 6, WR: 6, TE: 2, K: 1, DEF: 1, FLEX: 2
}

export const POS_MIN_DEFAULTS = {
  QB: 2, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1, FLEX: 1
}

export const initialState = {
  phase: 'setup',
  config: null,
  players: [],
  teams: [],
  picks: [],
  selectedPlayerId: null,
  draftOrder: [],
  penalties: [],
  currentAuctionNomIdx: 0,
  auctionRound: 1,
  serpRound: 1,
  serpPickIdx: 0,
  pbRecordId: null,
}