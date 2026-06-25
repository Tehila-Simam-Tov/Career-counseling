import React, { useEffect, useState } from 'react'
import Home from './components/Home'
import Questions from './components/Questions'
import Subjects from './components/Subjects'

type QAnswers = Record<string, number>

type Question = { id: string; text: string; options?: string[] }
type Recommendation = { profession: string; score: number; reason: string }
type QuestionAnswer = { questionId: string; selectedOption: number }

function buildFallbackQuestions(profileText: string): Question[] {
  const text = profileText.toLowerCase()
  const baseQuestions: Question[] = []

  if (/problem|logic|math|code|analy|data|science/.test(text)) {
    baseQuestions.push({
      id: 'q1',
      text: 'Do you enjoy solving complex problems and uncovering patterns?',
      options: ['Not really', 'Sometimes', 'Usually', 'Absolutely']
    })
  }

  if (/people|help|teach|care|service|lead|social/.test(text)) {
    baseQuestions.push({
      id: 'q2',
      text: 'Do you enjoy helping others and working closely with people?',
      options: ['Not really', 'Sometimes', 'Usually', 'Absolutely']
    })
  }

  if (/design|art|create|music|write|visual|build|craft/.test(text)) {
    baseQuestions.push({
      id: 'q3',
      text: 'Do you enjoy creating, designing, or expressing ideas in a visual way?',
      options: ['Not really', 'Sometimes', 'Usually', 'Absolutely']
    })
  }

  if (/plan|organize|detail|structure|manage|project/.test(text)) {
    baseQuestions.push({
      id: 'q4',
      text: 'Do you prefer structure, planning, and carefully organized work?',
      options: ['Not really', 'Sometimes', 'Usually', 'Absolutely']
    })
  }

  while (baseQuestions.length < 4) {
    baseQuestions.push({
      id: `q${baseQuestions.length + 1}`,
      text: 'Would you be interested in a profession that matches your strengths and interests?',
      options: ['Not really', 'Maybe', 'Probably', 'Definitely']
    })
  }

  return baseQuestions.slice(0, 4)
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [profileText, setProfileText] = useState('')
  const [page, setPage] = useState<'home' | 'questions' | 'results'>('home')
  const [theme, setTheme] = useState<'glass' | 'vibrant'>(() => {
    try { return (localStorage.getItem('theme') as any) || 'glass' } catch { return 'glass' }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  function handleAnswerChange(qid: string, value: number | undefined) {
    setAnswers(prev => {
      const next = { ...prev }
      if (value === undefined) delete next[qid]
      else next[qid] = value
      return next
    })
  }

  async function loadQuestions(text: string) {
    const safeText = text.trim() || 'I enjoy solving problems, learning new skills, and working with people.'

    try {
      const response = await fetch('http://localhost:5001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileText: safeText })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      if (Array.isArray(payload?.questions) && payload.questions.length > 0) {
        setQuestions(payload.questions)
        return
      }
    } catch (error) {
      console.warn('Falling back to local question generation:', error)
    }

    setQuestions(buildFallbackQuestions(safeText))
  }

  async function loadRecommendations(text: string, currentAnswers: QAnswers) {
    const safeText = text.trim() || 'I enjoy solving problems, learning new skills, and working with people.'
    const answerList: QuestionAnswer[] = Object.entries(currentAnswers)
      .filter(([, selectedOption]) => selectedOption !== undefined)
      .map(([questionId, selectedOption]) => ({ questionId, selectedOption }))

    try {
      const response = await fetch('http://localhost:5001/api/recommend-professions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileText: safeText,
          answers: answerList
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      if (Array.isArray(payload?.recommendations) && payload.recommendations.length > 0) {
        setRecommendations(payload.recommendations)
        return
      }
    } catch (error) {
      console.warn('Failed to load profession recommendations:', error)
    }

    setRecommendations([
      {
        profession: 'Career guidance insight',
        score: 75,
        reason: 'The recommendation service is temporarily unavailable, so a general professional direction is shown.'
      }
    ])
  }

  function reset() {
    setAnswers({})
    setQuestions([])
    setRecommendations([])
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
              setIsSubmitting(true)
              await loadQuestions(profileText)
              setIsSubmitting(false)
              setPage('questions')
            }}
          />
        )}
        {page === 'questions' && (
          <Questions
            questions={questions}
            answers={answers}
            onChange={handleAnswerChange}
            onComplete={async () => {
              setIsSubmitting(true)
              await loadRecommendations(profileText, answers)
              setIsSubmitting(false)
              setPage('results')
            }}
            onBack={() => setPage('home')}
            onResetAnswers={reset}
            isSubmitting={isSubmitting}
          />
        )}
        {page === 'results' && (
          <Subjects
            recommendations={recommendations}
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
