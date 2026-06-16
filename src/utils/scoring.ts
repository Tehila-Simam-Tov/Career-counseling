export function computeScores(professions: string[], scoresMap: Record<string, Record<string, number>>, answers: Record<string, boolean>) {
  const totals: Record<string, number> = {}
  professions.forEach(p => (totals[p] = 0))

  Object.keys(answers).forEach(qid => {
    if (!answers[qid]) return
    const per = scoresMap[qid] || {}
    professions.forEach(p => {
      totals[p] += per[p] || 0
    })
  })

  return totals
}
