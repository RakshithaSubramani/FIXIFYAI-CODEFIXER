# FIXIFYAI — AI Code Debugger & Explainer

FIXIFYAI is a full-stack project that turns “paste buggy code” into a structured debugging report with:

- human-friendly explanation
- concrete issues (with severity + location hints)
- step-by-step fixes with reasons
- corrected code (with comments marking changes)
- optional optimized version
- diff view + history (stored in MongoDB)

## Novel bits

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

