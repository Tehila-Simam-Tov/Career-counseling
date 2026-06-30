// Shared TypeScript types for the simulation workflow

export interface UserSkill {
  skill:      string
  confidence: number
}

export interface SimulationData {
  simulationTitle:      string
  description:          string
  instructions:         string
  expectedAnswerFormat: string
}

export interface EvaluationReport {
  score:      number
  strengths:  string[]
  weaknesses: string[]
  reasoning:  string
}

export interface FinalRecommendation {
  finalProfession:  string
  confidence:       number
  explanation:      string
  recommendations:  string[]
}
