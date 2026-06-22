import React, { useEffect, useState } from 'react'
import Home from './components/Home'
import Questions from './components/Questions'
import Subjects from './components/Subjects'

type QAnswers = Record<string, boolean>

type Question = { id: string; text: string }

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [profileText, setProfileText] = useState('')
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

  async function loadQuestions(text: string) {
    const safeText = text.trim() || 'I enjoy solving problems and working with people.'

    try {
      const response = await fetch('http://localhost:5001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileText: safeText
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      if (Array.isArray(payload?.questions) && payload.questions.length > 0) {
        setQuestions(payload.questions)
      } else {
        setQuestions([])
      }
    } catch (error) {
      console.warn('Failed to load AI questions:', error)
      setQuestions([])
    }
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
            profileText={profileText}
            onProfileTextChange={setProfileText}
            onToggleTheme={() => setTheme(t => (t === 'glass' ? 'vibrant' : 'glass'))}
            onStart={async () => {
              await loadQuestions(profileText)
              setPage('questions')
            }}
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
