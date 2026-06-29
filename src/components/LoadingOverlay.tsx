import React from 'react'

const STEPS = [
  { icon: '🧠', label: 'Analyzing your profile...' },
  { icon: '🔧', label: 'Running skill analysis tool...' },
  { icon: '📊', label: 'Calculating match percentages...' },
  { icon: '🎯', label: 'Preparing recommendations...' },
]

export default function LoadingOverlay({ visible, label }: { visible: boolean; label?: string }) {
  const [step, setStep] = React.useState(0)

  React.useEffect(() => {
    if (!visible) { setStep(0); return }
    const id = setInterval(() => setStep(s => (s + 1) % STEPS.length), 1800)
    return () => clearInterval(id)
  }, [visible])

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
