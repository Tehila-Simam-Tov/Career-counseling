import React, { useEffect, useState } from 'react'
import Home from './components/Home'
import Questions from './components/Questions'
import Subjects from './components/Subjects'
import Simulation from './components/Simulation'
import LoadingOverlay from './components/LoadingOverlay'
import type { UserSkill } from './types/simulation'

type QAnswers = Record<string, number>

type Question = { id: string; text: string; options?: string[] }
type Recommendation = { profession: string; score: number; reason: string }
type Skill = { name: string; percentage: number }
type QuestionAnswer = { questionId: string; question: string; selectedOption: number; answer: string }

function buildFallbackQuestions(profileText: string): Question[] {
  const text = profileText.toLowerCase()
  const baseQuestions: Question[] = []

  if (/problem|logic|math|code|analy|data|science/.test(text)) {
    baseQuestions.push({
      id: 'q1',
      text: 'Do you enjoy solving complex problems and uncovering patterns?',
      options: ['Absolutely — it energises me', 'Sometimes, depending on the topic', 'Not really my thing']
    })
  }

  if (/people|help|teach|care|service|lead|social/.test(text)) {
    baseQuestions.push({
      id: 'q2',
      text: 'Do you enjoy helping others and working closely with people?',
      options: ['Yes, it is very fulfilling', 'In small doses', 'I prefer working independently']
    })
  }

  if (/design|art|create|music|write|visual|build|craft/.test(text)) {
    baseQuestions.push({
      id: 'q3',
      text: 'Do you enjoy creating, designing, or expressing ideas visually?',
      options: ['Constantly — creativity drives me', 'Occasionally', 'Rarely']
    })
  }

  if (/plan|organize|detail|structure|manage|project/.test(text)) {
    baseQuestions.push({
      id: 'q4',
      text: 'Do you prefer structure, planning, and carefully organised work?',
      options: ['Yes, I thrive with clear structure', 'A balance of both', 'I prefer flexibility and spontaneity']
    })
  }

  while (baseQuestions.length < 4) {
    baseQuestions.push({
      id: `q${baseQuestions.length + 1}`,
      text: 'How important is it that your career aligns closely with your personal interests?',
      options: ['Extremely important', 'Somewhat important', 'Not a priority']
    })
  }

  return baseQuestions.slice(0, 4)
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [profileText, setProfileText] = useState('')
  const [page, setPage] = useState<'home' | 'questions' | 'agent' | 'results' | 'simulation'>('home')
  const [agentQuestions, setAgentQuestions] = useState<Question[]>([])
  const [agentAnswers, setAgentAnswers] = useState<QAnswers>({})
  const [agentRound, setAgentRound] = useState(0)
  // allQA accumulates Q&A pairs across all rounds for the agent
  const allQARef = React.useRef<QuestionAnswer[]>([])
  const [theme, setTheme] = useState<'glass' | 'vibrant'>(() => {
    try { return (localStorage.getItem('theme') as any) || 'glass' } catch { return 'glass' }
  })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState<string | undefined>(undefined)

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
    setLoadingLabel('Generating personalised questions...')
    try {
      const response = await fetch('http://localhost:5002/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileText: safeText })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const payload = await response.json()
      if (Array.isArray(payload?.questions) && payload.questions.length > 0) {
        setSessionId(payload.sessionId)
        setQuestions(payload.questions)
        return
      }
    } catch (error) {
      console.warn('Falling back to local question generation:', error)
    }

    setQuestions(buildFallbackQuestions(safeText))
  }

  async function loadRecommendations() {
    if (!sessionId) return
    setLoadingLabel('Generating recommendations...')
    try {
      const response = await fetch('http://localhost:5002/api/recommend-professions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

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

  function buildQAPairs(qs: Question[], ans: QAnswers): QuestionAnswer[] {
    return qs
      .filter(q => ans[q.id] !== undefined)
      .map(q => ({
        questionId: q.id,
        question: q.text,
        selectedOption: ans[q.id],
        answer: q.options?.[ans[q.id]] ?? (ans[q.id] === 0 ? 'Yes' : 'No')
      }))
  }

  async function runAgent(newAnswers: QuestionAnswer[]) {
    if (!sessionId) return
    const round = agentRound
    setIsSubmitting(true)
    setLoadingLabel(round === 0 ? 'Analysing your answers...' : `Follow-up round ${round} — thinking...`)
    try {
      const response = await fetch('http://localhost:5002/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, newAnswers })
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data.action === 'ask_questions') {
        setAgentQuestions(data.questions)
        setAgentAnswers({})
        setAgentRound(prev => prev + 1)
        setPage('agent')
      } else {
        // recommend_professions
        const recs = (data.recommendations || []).map((r: any) => ({
          profession: r.profession,
          score: r.match_percentage ?? r.score ?? 0,
          reason: r.reason
        }))
        setRecommendations(recs)
        setSkills(data.skills || [])
        setPage('results')
      }
    } catch (err) {
      console.warn('Agent call failed, falling back to direct recommendation', err)
      await loadRecommendations()
      setPage('results')
    } finally {
      setIsSubmitting(false)
      setLoadingLabel(undefined)
    }
  }

  function reset() {
    setAnswers({})
    setQuestions([])
    setRecommendations([])
    setSkills([])
    setAgentQuestions([])
    setAgentAnswers({})
    setAgentRound(0)
    setSessionId(null)
    allQARef.current = []
    setPage('home')
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'vibrant' ? 'theme-vibrant' : 'theme-glass'}`}>
      <LoadingOverlay
          visible={isSubmitting}
          label={loadingLabel}
          mode={page === 'simulation' ? 'simulation' : 'career'}
        />
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
              const initialQA = buildQAPairs(questions, answers)
              allQARef.current = initialQA
              await runAgent(initialQA)
            }}
            onBack={() => setPage('home')}
            onResetAnswers={reset}
            isSubmitting={isSubmitting}
          />
        )}
        {page === 'agent' && (
          <Questions
            questions={agentQuestions}
            answers={agentAnswers}
            agentRound={agentRound}
            onChange={(qid, val) => setAgentAnswers(prev => {
              const next = { ...prev }
              if (val === undefined) delete next[qid]
              else next[qid] = val
              return next
            })}
            onComplete={async () => {
              const roundQA = buildQAPairs(agentQuestions, agentAnswers)
              allQARef.current = [...allQARef.current, ...roundQA]
              await runAgent(roundQA)
            }}
            onBack={() => setPage('questions')}
            onResetAnswers={reset}
            isSubmitting={isSubmitting}
          />
        )}
        {page === 'results' && (
          <Subjects
            recommendations={recommendations}
            skills={skills}
            questions={questions}
            answers={answers}
            onRetake={reset}
            onBack={() => setPage('questions')}
            onValidate={sessionId ? () => setPage('simulation') : undefined}
          />
        )}
        {page === 'simulation' && sessionId && (
          <Simulation
            sessionId={sessionId}
            profession={recommendations[0]?.profession ?? ''}
            userSkills={skills.map(s => ({ skill: s.name, confidence: s.percentage })) as UserSkill[]}
            onStartOver={reset}
          />
        )}
      </div>
    </div>
  )
}
