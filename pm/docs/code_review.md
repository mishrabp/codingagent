# Code Review

Date: 2026-11-16
Scope: the whole `pm/` project. Only `pm/frontend` contains code; `pm/backend` and `pm/scripts` hold placeholder `AGENTS.md` files only.

## Summary

The frontend is a small, readable Next.js demo with a clean separation between pure board logic (`src/lib/kanban.ts`) and UI components. Lint is clean, the production build succeeds and all tests pass. The main problems are:

- A required feature (editing cards) is missing.
- The Next.js version has known critical and high vulnerabilities.
- `tsc` fails on the test files.
- Git state is inconsistent: the current source is untracked and an older layout is still committed.
- Accessibility problems in drag and drop.
- Several things to settle before the backend and AI work (Parts 3 to 10) build on top of this code.

## Checks run

| Check | Command | Result |
|---|---|---|
| Lint | `npm run lint` | Pass, no warnings |
| Type check | `npx tsc --noEmit` | **Fail**, 17 errors in test files |
| Build | `npm run build` | Pass, `/` prerendered as static |
| Unit tests | `npm run test:unit` | 6/6 pass |
| E2E tests | `npm run test:e2e` | 3/3 pass |
| Coverage | `npx vitest run --coverage` | `kanban.ts` 86% lines / 74% branches; components 89% lines |
| Audit | `npm audit` | 25 vulnerabilities (4 critical, 14 high); production deps alone: 6 (1 critical, 4 high) |

## Findings

Severity: High = fix before building further; Medium = fix during the relevant plan part; Low = cleanup.

### High

**H1. Card editing is not implemented.**
`pm/AGENTS.md` requires that cards "can be moved with drag and drop, and edited". `Card` titles and details can only be set on creation (`NewCardForm.tsx`); there is no edit path in `KanbanCard.tsx` or `KanbanBoard.tsx`. Part 9 also needs an edit operation for the AI.
Action: add inline edit (title and details) to `KanbanCard` with an `onEdit(cardId, title, details)` handler in `KanbanBoard`. Add unit and e2e tests.

**H2. Vulnerable Next.js and transitive dependencies.**
`next@16.1.6` is affected by GHSA-673q-mjm6-r5xr (critical, RCE in `use cache` functions) and GHSA-26hh-7cqf-hhc6 (middleware bypass). Its bundled `postcss` and `sharp` add four high-severity advisories. The app does not use `use cache` or middleware today, so actual exposure is low. Still, the coding standards require the latest versions, and later parts may add middleware for auth.
Action: upgrade `next` and `eslint-config-next` to `16.4.6` or later, run `npm audit fix`, then re-run all checks. Consider moving `vitest` to the current major (5.x) at the same time.

**H3. `tsc --noEmit` fails on test files.**
`src/test/vitest.d.ts` references `vitest`, not `vitest/globals`, so `describe`, `it` and `expect` have no types in `src/**/*.test.ts(x)`, even though `vitest.config.ts` sets `globals: true`. Tests run because Vitest injects the globals at runtime, and `next build` passes because it does not type-check the test files. Editors and any CI type check will fail.
Action: in `tsconfig.json` add `"types": ["vitest/globals", "@testing-library/jest-dom"]` and delete `src/test/vitest.d.ts`, or import `describe/it/expect` from `vitest` explicitly. Add `npx tsc --noEmit` to the standard checks.

**H4. Git state does not match the code.**
The outer repo tracks an older frontend layout (`pm/frontend/app/`, `lib/board.ts`, `tests/board.spec.ts`, `vitest.setup.ts`), which is deleted in the working tree. The real code (`pm/frontend/src/`, `tests/kanban.spec.ts`, `postcss.config.mjs`, `pm/docs/`, `pm/scripts/`, `pm/.gitignore`) is untracked. `pm/frontend/AGENTS.md`, which Part 1 needs, is deleted.
Action: stage the deletions and the new files and commit them, so the repo history reflects the current code. Recreate `pm/frontend/AGENTS.md` as part of Part 1.

### Medium

**M1. Drag and drop is not keyboard accessible, and cards nest interactive elements.**
`KanbanBoard.tsx` registers only `PointerSensor`. `useSortable` attributes still give each `<article>` `role="button"` and `tabIndex=0`, so keyboard users can focus a card but cannot move it. The "Remove" `<button>` sits inside that role=button element, which is an ARIA nesting violation. Also, `{...listeners}` on the whole card means pointer-down on Remove can start a drag; only the 6px activation distance prevents it.
Action: add `KeyboardSensor` with `sortableKeyboardCoordinates`. Either use a dedicated drag handle that gets `listeners`/`attributes`, or keep the whole card draggable and move Remove outside the role=button element.

**M2. Column rename fires on every keystroke and allows empty titles.**
`KanbanColumn.tsx:44` calls `onRename` on every change. That is fine for local state, but once Part 7 persists to the backend it means one API call per keystroke. An empty title is also accepted.
Action: in Part 7, keep a local draft and commit on blur or Enter. Revert to the previous title if the trimmed value is empty.

**M3. Rendering assumes board data is consistent.**
`KanbanBoard.tsx` maps `column.cardIds` to `board.cards[cardId]`. A dangling id yields `undefined` and crashes `KanbanCard`. This cannot happen with local-only state today. It can happen once the board comes from the database or from AI Structured Outputs (Part 9).
Action: in Part 6 or Part 9, validate board updates on the backend (Pydantic model plus a check that every `cardId` exists in `cards` and each card appears in exactly one column) before saving. Do not add defensive code in the UI.

**M4. Same-column drop onto the column area moves the card to the end.**
`moveCard` (`kanban.ts:103-113`): if `over` resolves to the card's own column rather than a sibling card, the card jumps to the bottom. With `closestCorners`, this can happen when dropping in the gap between cards. It is not covered by tests.
Action: decide on the intended behaviour. Probably return `columns` unchanged when dropping on your own column. Add a unit test either way.

**M5. Test gaps.**
- `moveCard` tests do not cover invalid ids, same-index no-op, insertion before a card in another column at a non-zero index, or the same-column/over-column branch (M4). Uncovered lines: `kanban.ts` 99, 107-112, 122-123, 138-139, 160.
- No test covers dropping into an empty column ("Drop a card here" state), the NewCardForm cancel path, or blank-title rejection (`NewCardForm.tsx` 16-17, 55-57).
- E2E covers load, add and move. It does not cover rename, delete, or that state survives a reload (needed from Part 7).
- E2E runs against `next dev`. From Part 3 the app is served statically by FastAPI, so e2e should target the container or FastAPI URL.

Action: add the unit cases above now. Re-point `playwright.config.ts` `baseURL`/`webServer` at the FastAPI server in Part 3.

**M6. Static export is not configured.**
Part 3 needs FastAPI to serve a static build. `next.config.ts` is empty, so `next build` produces a server bundle, not `out/`.
Action: set `output: "export"` in Part 3. Note that `next/font/google` (in `layout.tsx`) downloads fonts at build time, so the Docker build stage needs network access.

**M7. Playwright artifacts are not ignored.**
`pm/frontend/test-results/` is untracked and not in `.gitignore`.
Action: add `/test-results/` and `/playwright-report/` to `pm/frontend/.gitignore`.

### Low

**L1. `useMemo` is unnecessary.** In `KanbanBoard.tsx`, `const cardsById = useMemo(() => board.cards, [board.cards])` returns the same reference it is given. Use `board.cards` directly.

**L2. `createId` uses `Math.random`** (`kanban.ts:157-161`). Use `crypto.randomUUID()`. It is simpler and avoids collisions. Once the backend exists, the database should assign ids instead.

**L3. Duplicated card markup.** `KanbanCardPreview` repeats the body of `KanbanCard`. Extract the shared title and details block, or render `KanbanCardPreview` inside `KanbanCard`.

**L4. Redundant `columnId` parameter.** `handleDeleteCard(columnId, cardId)` could find the column itself, which removes the closure in `KanbanColumn.tsx:56`. Optional.

**L5. UI copy.** `"{cards.length} cards"` shows "1 cards". The header "One board. Five columns." is hardcoded rather than derived. Column titles are inputs, so the page has `h1` then `h4` with no `h2`/`h3`.

**L6. Type and version drift.** `@types/node` is `^20` while the runtime is Node 24. The `tsconfig` target is `ES2017`. Bump both to match current tooling.

**L7. Delete has no undo or confirmation.** One click permanently removes a card. That is acceptable for an MVP, but it matters more once the board is persisted and the AI can also delete cards.

## Plan status

| Part | Status |
|---|---|
| 1 Plan | Not done: `PLAN.md` is still the outline; `frontend/AGENTS.md` missing |
| 2 Scaffolding (Docker, FastAPI, scripts) | Not started |
| 3-10 | Not started |

## Action list (in order)

1. [x] Commit the current code and remove the stale tracked files (H4)
2. [x] Upgrade Next.js and fix audit findings; re-run lint, tsc, build and tests (H2). Done: next 16.4.6, vitest 5.1, vite 8, @types/node 24 (also L6). Remaining: 7 moderate advisories in minimatch via typescript-eslint (lint tooling only, no upstream fix yet)
3. [x] Fix test typings so `tsc --noEmit` passes (H3). Done: reference `vitest/globals`, import `@testing-library/jest-dom/vitest`
4. [x] Add `test-results/` and `playwright-report/` to `.gitignore` (M7)
5. [ ] Complete Part 1: detailed `PLAN.md` and `frontend/AGENTS.md`
6. [ ] Implement card editing with tests (H1)
7. [ ] Add keyboard sensor and fix nested interactive elements (M1)
8. [ ] Decide on same-column drop behaviour and extend `moveCard` tests (M4, M5)
9. [ ] Low-severity cleanups L1-L6
10. [ ] Part 3: `output: "export"` and point e2e at FastAPI (M6, M5)
11. [ ] Part 6/9: backend validation of board integrity (M3)
12. [ ] Part 7: commit column rename on blur or Enter (M2)
