export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())

  return lines.slice(1)
    .map(line => {
      const values = parseCSVLine(line)
      const row = {}
      headers.forEach((h, i) => {
        row[h] = values[i]?.trim() ?? ''
      })
      return {
        id: parseInt(row['id']) || 0,
        name: row['name'] || '',
        position: row['position']?.toUpperCase() || '',
        nflTeam: row['nflteam'] || row['nfl_team'] || row['team'] || '',
        overallRank: parseInt(row['overallrank'] || row['overall_rank'] || row['rank']) || 0,
        positionRank: parseInt(row['positionrank'] || row['position_rank'] || row['pos_rank']) || 0,
        adp: parseFloat(row['adp']) || 0,
        auctionValue: parseInt(row['auctionvalue'] || row['auction_value'] || row['value']) || 0,
        byeWeek: parseInt(row['byeweek'] || row['bye_week'] || row['bye']) || 0,
        notes: row['notes'] || '',
        drafted: false,
      }
    })
    .filter(p => p.name)
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
