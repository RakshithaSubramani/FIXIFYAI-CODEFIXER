# FIXIFYAI — AI Code Debugger & Explainer

FIXIFYAI is a full-stack project that turns “paste buggy code” into a structured debugging report with:

- human-friendly explanation
- concrete issues (with severity + location hints)
- step-by-step fixes with reasons
- corrected code (with comments marking changes)
- optional optimized version
- diff view + history (stored in MongoDB)

## What makes it resume-worthy (novel bits)

- **Structured outputs**: the model is instructed to return **machine-validated JSON**, which the UI renders into sections reliably (instead of brittle regex parsing).
- **Evidence-first reports**: each detected problem includes **severity**, **approx line**, and a **snippet** so users can verify claims quickly.
- **Safety & trust**: request validation (size limits, supported languages), defensive parsing/validation, and safe error handling.
- **Pluggable model layer**: the backend isolates the LLM call behind a service so you can swap Gemini/OpenAI/local models without rewriting routes.

## Architecture (high level)

- **frontend/**: React UI (paste code → results + diff + history)
- **backend/**: Express API + MongoDB (analyze/fix endpoints + persistence)

Backend pipeline conceptually:

1. Validate request (language, size, required fields)
2. Ask the model for a strict JSON report (analysis/problems/fixes/codes)
3. Validate/normalize model output
4. Persist to MongoDB
5. Return structured report to the UI

## Environment variables

Backend expects:

- `MONGO_URI` — MongoDB connection string
- `GEMINI_API_KEY` — Google Gemini API key
- `GEMINI_MODEL` (optional) — defaults to `gemini-1.5-flash`
- `PORT` (optional)
- `DISABLE_DB=1` (optional) — disable MongoDB Atlas and use local file history
- `HISTORY_FILE` (optional) — override history JSON file path

Frontend expects (optional):

- `REACT_APP_API_URL` — backend base URL (defaults to `http://localhost:5000`)

## Run locally

Backend:

- `cd backend`
- `npm install`
- `npm run dev` (or `npm start`)

Frontend:

- `cd frontend`
- `npm install`
- `npm start`

## API

- `POST /api/fix` — returns `{ fixedCode, explanation, report, model }`
- `POST /api/analyze` — returns `{ report, model }`
- `GET /api/history` — recent requests (empty if Mongo is not configured)

## Push to GitHub (fix “src refspec main does not match any”)

That error usually means you have **no commits yet** or your branch is named **master** instead of **main**.

From the project root:

- `git init`
- `git add .`
- `git commit -m "Initial commit"`
- `git branch -M main`
- `git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git`
- `git push -u origin main`
