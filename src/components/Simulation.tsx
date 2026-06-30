import React, { useEffect, useState } from 'react'
import { useSimulation } from '../hooks/useSimulation'
import type { UserSkill } from '../types/simulation'

interface Props {
  sessionId:  string
  profession: string
  userSkills: UserSkill[]
  onStartOver: () => void
}

export default function Simulation({ sessionId, profession, userSkills, onStartOver }: Props) {
  const {
    simulation,
    evaluation,
    finalRecommendation,
    isLoadingSimulation,
    isLoadingEvaluation,
    error,
    fetchSimulation,
    submitSolution
  } = useSimulation()

  const [answer, setAnswer]   = useState('')
  const [tried,  setTried]    = useState(false)

  // Fetch simulation on mount
  useEffect(() => {
    fetchSimulation(sessionId, profession, userSkills)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    if (answer.trim().length < 10) { setTried(true); return }
    setTried(false)
    submitSolution(sessionId, profession, answer.trim(), userSkills)
  }

  // ── Loading: generating simulation ──────────────────────────────────────
  if (isLoadingSimulation) {
    return (
      <div className="card rounded-[36px] p-8 animate-fade-up flex flex-col items-center gap-6">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-indigo-500" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🧪</div>
        </div>
        <p className="text-sm font-semibold text-slate-700 animate-pulse">
          Generating your profession simulation...
        </p>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !simulation) {
    return (
      <div className="card rounded-[36px] p-8 animate-fade-up">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-rose-500">Error</p>
        <p className="mt-3 text-slate-700">{error}</p>
        <button onClick={onStartOver} className="button button-secondary mt-6 px-6">Start Over</button>
      </div>
    )
  }

  // ── Final recommendation ─────────────────────────────────────────────────
  if (finalRecommendation && evaluation) {
    const scoreColor =
      evaluation.score >= 75 ? 'text-emerald-600' :
      evaluation.score >= 50 ? 'text-amber-600'   : 'text-rose-600'

    const scoreBg =
      evaluation.score >= 75 ? 'bg-emerald-500' :
      evaluation.score >= 50 ? 'bg-amber-500'   : 'bg-rose-500'

    return (
      <div className="card rounded-[36px] p-8 animate-fade-up space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">Step 4 — Validation Complete</p>
          <h2 className="mt-3 text-3xl font-bold">Your Simulation Results</h2>
        </div>

        {/* Score */}
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Simulation Score</span>
            <span className={`text-3xl font-extrabold ${scoreColor}`}>{evaluation.score}<span className="text-lg font-semibold text-slate-400">/100</span></span>
          </div>
          <div className="h-3 rounded-full bg-white shadow-inner overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreBg}`}
              style={{ width: `${evaluation.score}%` }}
            />
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <p className="mb-2 text-sm font-semibold text-emerald-700">✅ Strengths</p>
            <ul className="space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="text-sm text-slate-700">• {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-700">⚠️ Areas to Improve</p>
            <ul className="space-y-1">
              {evaluation.weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-slate-700">• {w}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Reasoning */}
        <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 leading-7">
          <p className="mb-1 font-semibold text-slate-800">Evaluator's reasoning</p>
          <p>{evaluation.reasoning}</p>
        </div>

        {/* Final recommendation */}
        <div className="rounded-[28px] border-2 border-indigo-200 bg-indigo-50 p-6 shadow-sm">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">Final Recommendation</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <h3 className="text-2xl font-extrabold text-slate-900">{finalRecommendation.finalProfession}</h3>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
              {finalRecommendation.confidence}% confidence
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-700">{finalRecommendation.explanation}</p>

          {finalRecommendation.recommendations.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-indigo-700">Recommended next steps:</p>
              <ul className="space-y-1">
                {finalRecommendation.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-slate-700">→ {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end">
          <button onClick={onStartOver} className="button button-primary px-8">Start Over</button>
        </div>
      </div>
    )
  }

  // ── Simulation task + answer form ────────────────────────────────────────
  if (simulation) {
    return (
      <div className="card rounded-[36px] p-8 animate-fade-up space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">Step 3 — Profession Simulation</p>
          <h2 className="mt-3 text-3xl font-bold">{simulation.simulationTitle}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Profession: <span className="font-semibold text-slate-700">{profession}</span>
          </p>
        </div>

        {/* Scenario */}
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Scenario</p>
          <p className="text-slate-700 leading-7">{simulation.description}</p>
        </div>

        {/* Instructions */}
        <div className="rounded-[24px] border border-indigo-100 bg-indigo-50/60 p-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Instructions</p>
          <p className="text-slate-700 leading-7 whitespace-pre-line">{simulation.instructions}</p>
        </div>

        {/* Answer textarea */}
        <div>
          <label htmlFor="sim-answer" className="mb-2 block text-sm font-semibold text-slate-700">
            Your answer
            <span className="ml-2 text-xs font-normal text-slate-400">
              (expected format: {simulation.expectedAnswerFormat})
            </span>
          </label>
          <textarea
            id="sim-answer"
            rows={8}
            value={answer}
            onChange={e => { setAnswer(e.target.value); setTried(false) }}
            placeholder={`Write your response here in ${simulation.expectedAnswerFormat} format...`}
            disabled={isLoadingEvaluation}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white disabled:opacity-60"
          />
          {tried && answer.trim().length < 10 && (
            <p className="mt-2 text-sm text-rose-600">Please write at least 10 characters before submitting.</p>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <button onClick={onStartOver} className="button button-secondary px-6" disabled={isLoadingEvaluation}>
            Start Over
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoadingEvaluation}
            className="button button-primary px-8"
          >
            {isLoadingEvaluation ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Evaluating...
              </span>
            ) : 'Submit Solution'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
