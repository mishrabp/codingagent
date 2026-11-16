# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MVP Kanban board: a single board with 5 fixed, renameable columns. Cards have only a title and details; they can be added, deleted, and dragged between columns. The app opens with seeded dummy data. There is no persistence, no auth, and no search/filter/archive. Do not add features beyond this. The full spec is in `AGENTS.md`.

All code lives in `frontend/` (Next.js app, client rendered). Run every command below from `frontend/`.

## Commands

```bash
npm run dev                          # dev server on http://localhost:3000
npm run build
npm run lint                         # eslint .
npm test                             # vitest run (unit tests: lib/**/*.test.ts only)
npx vitest run lib/board.test.ts -t "<test name>"   # single unit test
npm run test:e2e                     # Playwright; starts/reuses `npm run dev` on :3000
npx playwright test tests/board.spec.ts -g "<test name>"  # single e2e test
```

## Next.js version warning

This uses Next.js 16 / React 19, which have breaking changes from older Next.js. Before writing Next.js code, read the relevant guide in `frontend/node_modules/next/dist/docs/` and follow its deprecation notices. `next dev` re-adds the agent-rules block in `frontend/AGENTS.md`; leave it there.

## Architecture

- `lib/board.ts` holds the whole domain model (`Board` > `Column` > `Card`), the seed data (`createInitialBoard`), and pure, immutable state transitions (`renameColumn`, `addCard`, `deleteCard`, `moveCard`). Invalid input (blank titles, unknown ids, same-column moves) returns the board unchanged. Put new board logic here and unit test it in `lib/board.test.ts`.
- `app/page.tsx` is a single `"use client"` page that keeps the board in `useState` and calls the `lib/board.ts` functions through `setBoard`. It also contains the `BoardColumn`, `KanbanCard`, and `BoardColumnPreview` components.
- Drag and drop uses `@dnd-kit/core`: columns are droppables and cards are draggables. `handleDragEnd` resolves the target column from either a column id or a card id under the pointer. Cards are appended to the target column; there is no reordering within a column.
- Hydration: before mount (`isMounted`), the page renders static `BoardColumnPreview` columns, and it renders the dnd-kit tree only after mount. Keep this split to avoid SSR/client mismatches from dnd-kit.
- Styling is plain CSS: `app/globals.css` (design tokens as CSS variables) plus `app/page.module.css`. No UI library.
- E2E tests in `tests/` select elements by accessible role and label (for example `getByLabel("Add a card to To do")`), so keep those aria labels stable.

## Color scheme (defined as variables in `globals.css`)

- `--yellow` `#ecad0a`: accent lines, highlights
- `--blue` `#209dd7`: links, key sections
- `--purple` `#753991`: submit buttons, important actions
- `--navy` `#032147`: main headings
- `--gray` `#888888`: supporting text, labels

## Standards (from AGENTS.md)

- Use the latest library versions and current idioms.
- Keep it simple: never over-engineer, no unnecessary defensive programming, no extra features.
- Keep the README minimal. Never use emojis.
- Finish work only when unit tests and Playwright tests pass and the dev server is running.
