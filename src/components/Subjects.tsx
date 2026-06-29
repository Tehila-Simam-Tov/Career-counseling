import React, { useState } from 'react'

type Recommendation = { profession: string; score: number; reason: string }

type Skill = { name: string; percentage: number }

type Question = { id: string; text: string; options?: string[] }

export default function Subjects({
  recommendations,
  skills,
  questions,
  answers,
  onRetake,
  onBack,
}: {
  recommendations: Recommendation[]
  skills: Skill[]
  questions: Question[]
  answers: Record<string, number>
  onRetake: () => void
  onBack: () => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const ranked = [...recommendations].sort((a, b) => b.score - a.score)

  return (
    <div className="card rounded-[36px] p-8 animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">Step 3</p>
          <h2 className="mt-3 text-3xl font-bold">Recommended professions</h2>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-700">Ranked from strongest to weakest fit</div>
      </div>

      {skills.length > 0 && (
        <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">Identified Skills</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {skills.map(s => (
              <div key={s.name} className="flex items-center justify-between rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
                <span className="font-medium text-slate-800">{s.name}</span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {ranked.map(item => {
          const isOpen = !!expanded[item.profession]
          const pct = Math.min(Math.max(item.score, 0), 100)

          return (
            <div key={item.profession} className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-2xl">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">{item.profession}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-600">{item.score}% fit</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-white shadow-inner overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(prev => ({ ...prev, [item.profession]: !prev[item.profession] }))}
                  className={`toggle-detail-btn inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow transition ${isOpen ? 'rotate-180' : ''}`}
                  aria-expanded={isOpen}
                  aria-controls={`detail-${item.profession}`}
                >
                  <span className="text-xl">➤</span>
                </button>
              </div>

              {isOpen && (
                <div id={`detail-${item.profession}`} className="mt-5 rounded-3xl border border-slate-200 bg-white/90 p-5 text-slate-700 leading-7">
                  <p>{item.reason}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {questions.map(q => (
                      <div key={q.id} className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{q.text}</div>
                        <div className="mt-2">
                          Answer: <span className="font-semibold">{answers[q.id] === undefined ? 'Not selected' : q.options?.[answers[q.id]] ?? 'Selected'}</span>
                        </div>
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
