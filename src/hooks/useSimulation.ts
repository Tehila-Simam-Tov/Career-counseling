import { useState } from 'react'
import type {
  UserSkill,
  SimulationData,
  EvaluationReport,
  FinalRecommendation
} from '../types/simulation'

const API_BASE = 'http://localhost:5002'

interface UseSimulationReturn {
  simulation:           SimulationData | null
  evaluation:           EvaluationReport | null
  finalRecommendation:  FinalRecommendation | null
  isLoadingSimulation:  boolean
  isLoadingEvaluation:  boolean
  error:                string | null
  fetchSimulation:      (sessionId: string, profession: string, userSkills: UserSkill[]) => Promise<void>
  submitSolution:       (sessionId: string, profession: string, userSolution: string, userSkills: UserSkill[]) => Promise<void>
  reset:                () => void
}

export function useSimulation(): UseSimulationReturn {
  const [simulation,          setSimulation]          = useState<SimulationData | null>(null)
  const [evaluation,          setEvaluation]          = useState<EvaluationReport | null>(null)
  const [finalRecommendation, setFinalRecommendation] = useState<FinalRecommendation | null>(null)
  const [isLoadingSimulation, setIsLoadingSimulation] = useState(false)
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false)
  const [error,               setError]               = useState<string | null>(null)

  async function fetchSimulation(sessionId: string, profession: string, userSkills: UserSkill[]) {
    setIsLoadingSimulation(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/simulation/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, profession, userSkills })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSimulation(data.simulation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate simulation')
    } finally {
      setIsLoadingSimulation(false)
    }
  }

  async function submitSolution(
    sessionId:    string,
    profession:   string,
    userSolution: string,
    userSkills:   UserSkill[]
  ) {
    if (!simulation) return
    setIsLoadingEvaluation(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/simulation/evaluate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, profession, simulation, userSolution, userSkills })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setEvaluation(data.evaluation)
      setFinalRecommendation(data.finalRecommendation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate solution')
    } finally {
      setIsLoadingEvaluation(false)
    }
  }

  function reset() {
    setSimulation(null)
    setEvaluation(null)
    setFinalRecommendation(null)
    setError(null)
  }

  return {
    simulation,
    evaluation,
    finalRecommendation,
    isLoadingSimulation,
    isLoadingEvaluation,
    error,
    fetchSimulation,
    submitSolution,
    reset
  }
}
