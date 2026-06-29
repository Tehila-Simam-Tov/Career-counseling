import React, { useState, useEffect } from 'react'

type Question = { id: string; text: string; options?: string[] }

const MAX_ROUNDS = 3

export default function Questions({
  questions,
  answers,
  onChange,
  onComplete,
  onBack,
  onResetAnswers,
  isSubmitting,
  agentRound,
}: {
  questions: Question[]
  answers: Record<string, number>
  onChange: (qid: string, value: number | undefined) => void
  onComplete: () => void
  onBack: () => void
  onResetAnswers: () => void
  isSubmitting: boolean
  agentRound?: number   // undefined = initial questions, 1-3 = agent follow-up round
}) {
  const [index, setIndex] = useState(0)
  const [tried, setTried] = useState(false)
  const [answered, setAnswered] = useState<Set<string>>(new Set())

  useEffect(() => { setIndex(0); setTried(false); setAnswered(new Set()) }, [questions])
  useEffect(() => { setTried(false) }, [index])
  const q = questions[index]
  const isLast = questions.length > 0 && index === questions.length - 1
  const options = q?.options ?? ['Yes', 'No']
  const isAgentRound = agentRound !== undefined

  function handleContinue() {
    if (!q || answers[q.id] === undefined) {
      setTried(true)
      return
    }
    setTried(false)
    if (isLast) onComplete()
    else setIndex(i => i + 1)
  }

  function handleSelect(qid: string, value: number) {
    setAnswered(prev => new Set(prev).add(qid))
    onChange(qid, value)
    setTried(false)
    if (isLast) {
      setTimeout(() => onComplete(), 400)
    }
  }

  function handleBack() {
    setTried(false)
    if (index === 0) onBack()
    else setIndex(i => i - 1)
  }

  return (
    <div className="card rounded-[36px] p-8 animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isAgentRound && (
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                🤖 Follow-up round {agentRound} of {MAX_ROUNDS}
              </span>
              {agentRound === MAX_ROUNDS && (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  Last round — results after this
                </span>
              )}
            </div>
          )}
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">
            Question {Math.min(index + 1, questions.length)} of {questions.length}
          </p>
          <h2 className="mt-3 text-3xl font-bold">
            {isAgentRound ? 'A few more questions to refine your results' : 'Choose the answer that fits you best'}
          </h2>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-700">Tap the option that feels most natural</div>
      </div>

      {q ? (
        <div className="question-card animate-fade-up">
          <h3 className="text-xl font-semibold text-slate-900">{q.text}</h3>
          <div className="mt-6 grid gap-3">
            {options.map((option, optionIndex) => (
              <button
                key={`${q.id}-${optionIndex}`}
                type="button"
                onClick={() => handleSelect(q.id, optionIndex)}
                aria-pressed={answers[q.id] === optionIndex}
                data-selected={answers[q.id] === optionIndex}
                className={`answer-option button text-left ${
                  answered.has(q.id) && answers[q.id] === optionIndex
                    ? 'selected-yes animate-pop'
                    : 'button-secondary'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {tried && answers[q.id] === undefined && (
            <p className="mt-3 text-sm text-rose-600">Please choose one answer before moving on.</p>
          )}
        </div>
      ) : (
        <div className="question-card animate-fade-up">
          <p className="text-sm text-rose-600">No questions were returned by the AI service. Please try another profile text.</p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <button onClick={handleBack} className="button button-secondary px-6">Back</button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => { if (q) { onChange(q.id, undefined); setTried(false) } }}
            className="button button-secondary px-6"
          >
            Delete Answer
          </button>
          <button onClick={handleContinue} className="button button-primary px-6" disabled={isSubmitting}>
            {isLast ? (isSubmitting ? 'Loading...' : 'See Results') : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
