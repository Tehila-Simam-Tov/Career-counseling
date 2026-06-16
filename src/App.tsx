import React, { useEffect, useState } from 'react'
import data from './data/professions.json'
import Home from './components/Home'
import Questions from './components/Questions'
import Subjects from './components/Subjects'

type QAnswers = Record<string, boolean>

export default function App() {
  const { questions } = data
  const [page, setPage] = useState<'home' | 'questions' | 'results'>('home')
  const [theme, setTheme] = useState<'glass' | 'vibrant'>(() => {
    try { return (localStorage.getItem('theme') as any) || 'glass' } catch { return 'glass' }
  })

  const [answers, setAnswers] = useState<QAnswers>(() => {
    try {
      const raw = localStorage.getItem('answers')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem('answers', JSON.stringify(answers))
  }, [answers])

  useEffect(() => {
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  function handleAnswerChange(qid: string, value: boolean | undefined) {
    setAnswers(prev => {
      const next = { ...prev }
      if (value === undefined) delete next[qid]
      else next[qid] = value
      return next
    })
  }

  function reset() {
    setAnswers({})
    setPage('home')
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'vibrant' ? 'theme-vibrant' : 'theme-glass'}`}>
      <div className="w-full max-w-5xl">
        {page === 'home' && (
          <Home
            theme={theme}
            onToggleTheme={() => setTheme(t => (t === 'glass' ? 'vibrant' : 'glass'))}
            onStart={() => setPage('questions')}
          />
        )}
        {page === 'questions' && (
          <Questions
            questions={questions}
            answers={answers}
            onChange={handleAnswerChange}
            onComplete={() => setPage('results')}
            onBack={() => setPage('home')}
            onResetAnswers={reset}
          />
        )}
        {page === 'results' && (
          <Subjects
            questions={questions}
            answers={answers}
            onRetake={reset}
            onBack={() => setPage('questions')}
          />
        )}
      </div>
    </div>
  )
}
