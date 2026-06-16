# Career Diagnosis — Occupational Diagnosis SPA

This is a client-only SPA built with Vite + React + TypeScript and Tailwind CSS. It asks 4 yes/no questions and computes recommended professions based on a JSON config.

Quick start

```bash
cd lesson2
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

Files of interest
- `src/data/professions.json` — questions, professions and per-question scores
- `src/utils/scoring.ts` — `computeScores` function
- `src/components` — `Home`, `Questions`, `Subjects`
