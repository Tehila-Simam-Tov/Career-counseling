import React from 'react'

export default function Home({
  theme,
  profileText,
  onProfileTextChange,
  onToggleTheme,
  onStart,
}: {
  theme: 'glass' | 'vibrant'
  profileText: string
  onProfileTextChange: (value: string) => void
  onToggleTheme: () => void
  onStart: () => void
}) {
  return (
    <div className="relative overflow-hidden card rounded-[40px] p-12 text-center animate-fade-up home-page-card">
      <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl animate-pulse-slow" />
      <div className="absolute right-10 top-24 h-32 w-32 rounded-full bg-fuchsia-300/25 blur-2xl animate-pulse-slow" />
      <div className="absolute left-10 bottom-10 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl animate-pulse-slow" />
      <div className="absolute inset-x-10 bottom-24 h-20 rounded-full bg-white/40 blur-2xl" />
      <div className="relative z-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-200/80 border border-white/80">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">⬇️</span>
            Career Compass
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full bg-slate-900/10 px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-900/15"
          >
            {theme === 'glass' ? 'Glassy' : 'Vibrant'}
          </button>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4">
          Discover the profession that fits your strengths
        </h1>
        <p className="mx-auto max-w-3xl text-slate-600 text-lg leading-8 mb-12">
          Answer a few thoughtful questions and receive a modern career recommendation with a dynamic profession preview.
        </p>

        <div className="grid gap-5 sm:grid-cols-3 mb-10">
          <div className="feature-card home-feature animate-float-up delay-100">
            <div className="feature-icon">⚡</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Fast</p>
              <p className="mt-2 text-sm text-slate-600">Complete in under a minute.</p>
            </div>
          </div>
          <div className="feature-card home-feature animate-float-up delay-200">
            <div className="feature-icon">✨</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Insightful</p>
              <p className="mt-2 text-sm text-slate-600">Designed to surface your strengths.</p>
            </div>
          </div>
          <div className="feature-card home-feature animate-float-up delay-300">
            <div className="feature-icon">🧭</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Flexible</p>
              <p className="mt-2 text-sm text-slate-600">View dynamic summaries for each career.</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
          <label htmlFor="profile-text" className="mb-2 block text-left text-sm font-semibold text-slate-700">
            Tell us about yourself
          </label>
          <textarea
            id="profile-text"
            rows={5}
            value={profileText}
            onChange={(e) => onProfileTextChange(e.target.value)}
            placeholder="Example: I love writing, solving problems, and helping people learn new things."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
          />
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={onStart}
            className="button button-primary px-10 py-4 text-white shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-transform duration-200 hover:-translate-y-1 btn-cta"
          >
            Start Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
