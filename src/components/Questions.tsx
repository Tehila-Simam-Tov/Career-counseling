import React, { useState } from 'react'

type Question = { id: string; text: string }

export default function Questions({
  questions,
  answers,
  onChange,
  onComplete,
  onBack,
  onResetAnswers,
}: {
  questions: Question[]
  answers: Record<string, boolean>
  onChange: (qid: string, value: boolean) => void
  onComplete: () => void
  onBack: () => void
  onResetAnswers: () => void
}) {
  const [index, setIndex] = useState(0)
  const [tried, setTried] = useState(false)
  const q = questions[index]
  const isLast = questions.length > 0 && index === questions.length - 1

  function handleContinue() {
    if (answers[q.id] === undefined) {
      setTried(true)
      return
    }
    setTried(false)
    if (isLast) onComplete()
    else setIndex(i => i + 1)
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
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600">
            Question {index + 1} of {questions.length}
          </p>
          <h2 className="mt-3 text-3xl font-bold">Your preferences</h2>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-700">Tap the best fit</div>
      </div>

      {q ? (
        <div className="question-card animate-fade-up">
          <h3>{q.text}</h3>
          <div className="answer-actions">
            <button
              type="button"
              onClick={() => { onChange(q.id, true); setTried(false) }}
              aria-pressed={answers[q.id] === true}
              data-selected={answers[q.id] === true}
              className={`answer-option button ${answers[q.id] === true ? 'selected-yes animate-pop' : 'button-secondary'}`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => { onChange(q.id, false); setTried(false) }}
              aria-pressed={answers[q.id] === false}
              data-selected={answers[q.id] === false}
              className={`answer-option button ${answers[q.id] === false ? 'selected-no animate-pop' : 'button-secondary'}`}
            >
              No
            </button>
          </div>
          {tried && answers[q.id] === undefined && (
            <p className="mt-3 text-sm text-rose-600">Please answer this question before displaying this result!</p>
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
            onClick={() => { onChange(q.id, undefined as any); setTried(false) }}
            className="button button-secondary px-6"
          >
            Delete Answer
          </button>
          <button onClick={handleContinue} className="button button-primary px-6">
            {isLast ? 'See Results' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
