import React from 'react'

const STEPS_CAREER = [
  { icon: '🧠', label: 'Analyzing your profile...' },
  { icon: '🔧', label: 'Running skill analysis tool...' },
  { icon: '📊', label: 'Calculating match percentages...' },
  { icon: '🎯', label: 'Preparing recommendations...' },
]

const STEPS_SIMULATION = [
  { icon: '🔌', label: 'Connecting to MCP server...' },
  { icon: '🔍', label: 'Discovering available tools...' },
  { icon: '🧪', label: 'Generating your simulation...' },
  { icon: '⏳', label: 'Almost ready...' },
]

const STEPS_EVALUATION = [
  { icon: '🔌', label: 'Connecting to MCP server...' },
  { icon: '📋', label: 'Evaluating your solution...' },
  { icon: '🤖', label: 'Running validation agent...' },
  { icon: '🎯', label: 'Producing final recommendation...' },
]

export default function LoadingOverlay({ visible, label, mode }: { visible: boolean; label?: string; mode?: 'career' | 'simulation' | 'evaluation' }) {
  const [step, setStep] = React.useState(0)

  const STEPS = mode === 'simulation' ? STEPS_SIMULATION
    : mode === 'evaluation' ? STEPS_EVALUATION
    : STEPS_CAREER

  React.useEffect(() => {
    if (!visible) { setStep(0); return }
    const id = setInterval(() => setStep(s => (s + 1) % STEPS.length), 1800)
    return () => clearInterval(id)
  }, [visible, STEPS.length])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-[32px] border border-slate-200 bg-white/90 px-12 py-10 shadow-2xl">
        {/* Spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-indigo-500" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            {STEPS[step].icon}
          </div>
        </div>

        {/* Step label */}
        <p className="text-sm font-semibold text-slate-700 animate-pulse">
          {label ?? STEPS[step].label}
        </p>

        {/* Dot progress */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                i === step ? 'bg-indigo-500 scale-125' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
