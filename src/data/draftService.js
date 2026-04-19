import pb from './pb'

const COLLECTION = 'ff_drafts'

export async function getDrafts() {
  try {
    const records = await pb.collection(COLLECTION).getFullList({
      sort: '-created',
    })
    return records
  } catch (err) {
    console.error('Failed to load drafts:', err)
    return []
  }
}

export async function createDraft(config, teams, players) {
  try {
    const record = await pb.collection(COLLECTION).create({
      name: config.draftName,
      status: 'active',
      config,
      teams,
      players,
      picks: [],
      phase: 'auction',
    })
    return record
  } catch (err) {
    console.error('Failed to create draft:', err)
    return null
  }
}

export async function saveDraft(id, state) {
  try {
    const record = await pb.collection(COLLECTION).update(id, {
      phase: state.phase,
      teams: state.teams,
      players: state.players,
      picks: state.picks,
      config: state.config,
      status: state.phase === 'done' ? 'complete' : 'active',
    })
    return record
  } catch (err) {
    console.error('Failed to save draft:', err)
    return null
  }
}

export async function loadDraft(id) {
  try {
    const record = await pb.collection(COLLECTION).getOne(id)
    return record
  } catch (err) {
    console.error('Failed to load draft:', err)
    return null
  }
}

export async function deleteDraft(id) {
  try {
    await pb.collection(COLLECTION).delete(id)
    return true
  } catch (err) {
    console.error('Failed to delete draft:', err)
    return false
  }
}