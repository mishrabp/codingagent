# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The only project is `pm/`, a Project Management MVP (Kanban board with an AI chat sidebar). `pm/AGENTS.md` holds the full business requirements, technical decisions, color scheme and coding standards. Read it, along with `pm/docs/PLAN.md` (the 10-part build plan), before starting work. Planning documents belong in `pm/docs/`.

Current state: the frontend loads and saves the board through a FastAPI backend (`pm/backend/`) that stores it in SQLite. Docker, the static build served by FastAPI, sign-in and AI are not built yet. `pm/scripts/` holds only a placeholder `AGENTS.md`. The persistence design is in `pm/docs/BACKEND_PLAN.md`.

## Target architecture (from pm/AGENTS.md)

- A Next.js frontend, statically built and served by a Python FastAPI backend at `/`
- The whole app is packaged in one Docker container, using `uv` for Python packages
- SQLite database, created on startup if it doesn't exist. The schema supports multiple users, but the MVP has one hardcoded login (`user` / `password`) and one board per user
- AI calls go through OpenRouter with the model `openai/gpt-oss-120b`. `OPENROUTER_API_KEY` is read from `pm/.env`. The AI receives the board JSON, the user's message and the conversation history, and returns Structured Outputs: a reply plus an optional board update. The UI refreshes when the board changes
- Start/stop scripts for Mac, Windows and Linux go in `pm/scripts/`

## Frontend (pm/frontend)

Next.js 16 (App Router), React 19, Tailwind v4, `@dnd-kit` for drag and drop. The path alias `@/` maps to `src/`.

```bash
cd pm/frontend
npm install
npm run dev              # dev server
npm run build
npm run lint
npm run test:unit        # Vitest (jsdom), src/**/*.test.{ts,tsx}
npx vitest run src/lib/kanban.test.ts   # single unit test file
npx vitest run -t "test name"           # single test by name
npm run test:e2e         # Playwright; starts its own backend (port 8100, fresh data/e2e.db) and Next dev server (port 3100, .next-e2e)
npx playwright test -g "moves a card"   # single e2e test
```

Data model (`src/lib/kanban.ts`): `BoardData` is `{ columns: Column[], cards: Record<id, Card> }`. Each column's ordered `cardIds` array is the only record of card placement and order. `moveCard()` is a pure function that handles reordering within a column and moving between columns, dropping either on a card or on an empty column area. `KanbanBoard.tsx` loads the board with `fetchBoard()` (`src/lib/api.ts`) and sends every change as a whole-board `PUT /api/board`, one save at a time; a rejected save reloads the board. Column titles save on blur or Enter. In development `next.config.ts` rewrites `/api/*` to `BACKEND_URL` (default `http://127.0.0.1:8000`), so run the backend alongside `npm run dev`. Columns are fixed (five ids, enforced by the backend) and can only be renamed.

E2E tests locate elements with `data-testid="column-<columnId>"` and `data-testid="card-<cardId>"`. Keep these attributes when changing components.

## Backend (pm/backend)

FastAPI, Python 3.13, uv, stdlib `sqlite3`. Details in `pm/backend/AGENTS.md`.

```bash
cd pm/backend
uv run uvicorn app.main:app --reload --port 8000
uv run pytest
uv run pytest tests/test_api.py -k restart   # single test
```

The board is one JSON row per user in `boards.data`; Pydantic `Board` in `app/models.py` validates every write. The database is `DB_PATH` (default `backend/data/kanban.db`, gitignored); a user's seeded board is created on first read. Seed data lives only in `app/seed.py`.

## Coding standards (from pm/AGENTS.md)

- Keep it simple: no over-engineering, no unnecessary defensive code, no extra features
- Use the latest library versions and current idiomatic approaches
- Keep READMEs minimal. Never use emojis
- When debugging, prove the root cause with evidence before applying a fix
- Colors: accent yellow `#ecad0a`, primary blue `#209dd7`, secondary purple `#753991` (submit/important buttons), dark navy `#032147` (headings), gray text `#888888`. In code these are the CSS variables used in `globals.css` (e.g. `var(--primary-blue)`)
