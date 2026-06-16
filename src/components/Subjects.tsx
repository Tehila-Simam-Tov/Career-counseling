import React, { useMemo, useState } from 'react'
import { computeScores } from '../utils/scoring'
import data from '../data/professions.json'

const professionSummaries: Record<string, string> = {
  'Software Engineer': 'Build elegant software solutions, tackle technical challenges, and shape digital experiences using code and collaboration.',
  'Graphic Designer': 'Craft visual stories with color, typography, and layout to make ideas feel polished and memorable.',
  Architect: 'Design structures that blend creativity with precision, from blueprints to beautiful built environments.',
  'Data Scientist': 'Extract insights from data, build predictive models, and turn numbers into action through intelligent analysis.',
}

const traitPhrases: Record<string, string> = {
  q1: 'You like solving complex problems.',
  q2: 'You value visual design and strong aesthetics.',
  q3: 'You enjoy structured, rule-driven work.',
  q4: 'You are energized by data and statistics.',
}

function buildDescription(profession: string, answers: Record<string, boolean>) {
  const selectedTraits = Object.entries(answers)
    .filter(([, value]) => value)
    .map(([qid]) => traitPhrases[qid])

  if (selectedTraits.length === 0) {
    return professionSummaries[profession]
  }

  return `${professionSummaries[profession]} ${selectedTraits.join(' ')}`
}

export default function Subjects({
  questions,
  answers,
  onRetake,
  onBack,
}: {
  questions: { id: string; text: string }[]
  answers: Record<string, boolean>
  onRetake: () => void
  onBack: () => void
}) {
  const { professions, scores } = data
  const totals = computeScores(professions, scores as any, answers)
  const sorted = useMemo(() => [...professions].sort((a, b) => totals[b] - totals[a]), [professions, totals])
  const topScore = totals[sorted[0]]
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <div className="card rounded-[36px] p-8 animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">Step 2</p>
          <h2 className="mt-3 text-3xl font-bold">Profession insights</h2>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-700">Click the arrow for quick career summaries</div>
      </div>

      <div className="space-y-4">
        {sorted.map(p => {
          const value = totals[p]
          const pct = topScore === 0 ? 0 : Math.round((value / topScore) * 100)
          const isOpen = !!expanded[p]

          return (
            <div key={p} className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="font-semibold">{p}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-600">score {value}</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-white shadow-inner overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full result-bar-inner" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(prev => ({ ...prev, [p]: !prev[p] }))}
                  className={`toggle-detail-btn inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow transition ${isOpen ? 'rotate-180' : ''}`}
                  aria-expanded={isOpen}
                  aria-controls={`detail-${p}`}
                >
                  <span className="text-xl">➤</span>
                </button>
              </div>

              {isOpen && (
                <div id={`detail-${p}`} className="mt-5 rounded-3xl border border-slate-200 bg-white/90 p-5 text-slate-700 leading-7">
                  <p>{buildDescription(p, answers)}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {questions.map(q => (
                      <div key={q.id} className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{q.text}</div>
                        <div className="mt-2">Answer: <span className="font-semibold">{answers[q.id] === undefined ? 'Not selected' : answers[q.id] ? 'Yes' : 'No'}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <button onClick={onBack} className="button button-secondary px-6">Back</button>
        <button onClick={onRetake} className="button button-primary px-6">Retake</button>
      </div>
    </div>
  )
}
