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
9. [ ] Low-severity cleanups L1-L6 (L1 and L6 done)
10. [ ] Part 3: `output: "export"` and point e2e at FastAPI (M6, M5)
11. [x] Part 6/9: backend validation of board integrity (M3). Done in `backend/app/models.py`
12. [x] Part 7: commit column rename on blur or Enter (M2). Done; empty titles revert
13. [ ] Fix save-failure handling so the UI cannot drift from the server (R1), handle a failed initial load (R2), and tell the user (R3). Add unit tests that simulate failed saves and loads
14. [ ] Address R4-R7 in Parts 3 and 9 as noted
15. [ ] Commit the backend persistence work and add `httpx2` (R8)
16. [ ] Fix accessibility failures A1-A6, then A7-A10. Add `@axe-core/playwright` to the e2e suite (A11)
17. [ ] Part 4: mark the app `noindex` and replace the template favicon and public assets (S1-S3)

## Follow-up review: backend persistence

Date: 2026-11-16
Scope: the uncommitted work on branch `backend-persistence` (FastAPI and SQLite backend, frontend loading and saving through `/api/board`), plus a re-check of the open items above.

### Checks run

| Check | Command | Result |
|---|---|---|
| Backend tests | `uv run pytest` | 23 pass, 1 warning (`httpx` with the Starlette test client is deprecated) |
| Lint | `npm run lint` | Pass |
| Type check | `npx tsc --noEmit` | Pass |
| Unit tests | `npm run test:unit` | 8/8 pass |
| E2E tests | `npm run test:e2e` | 4/4 pass, including changes kept after a reload |

### High

**R1. A failed save can leave the UI and the server out of step.**
In `KanbanBoard.tsx` `updateBoard`, each queued save has its own `.catch` that reloads the board. If save A fails while save B is queued, A's handler reloads the server's old board into the UI. B then runs and succeeds. B was built on A's local state, so the server now holds both changes, but nothing updates the UI after B. The user sees an older board, and their next change, built from it, overwrites B, so those edits are lost. If the reload also fails, the queue stays rejected: every later change skips its save and only retries the reload.
Action: reload only when the failed save is the last one queued, for example by comparing against a ref holding the latest board. Keep the queue resolved after a failed reload. Add unit tests that make one save fail with another queued, and that make the reload fail.

**R2. A failed initial load leaves "Loading board..." on screen forever.**
`fetchBoard().then(setBoard)` (`KanbanBoard.tsx:31-33`) has no `catch`. If the backend is down or returns an error, the page never leaves the loading state and the promise rejection goes unhandled.
Action: show a short error message with a retry button.

### Medium

**R3. Users are not told about failures.** A rejected save silently puts the board back. Show a one-line notice such as "Couldn't save, board reloaded". This also makes R1 and R2 visible.

**R4. Dev rewrites and e2e setup will not carry over to Part 3.** `next.config.ts` relies on `rewrites()`, which does not apply with `output: "export"`. That is fine once FastAPI serves `/api` from the same address, but the rewrite should stay clearly dev-only. `playwright.config.ts` starts `next dev` and uses `rm -f ... && DB_PATH=...`, which needs a Unix shell, while the project requires Windows start and stop scripts.
Action: in Part 3, point e2e at FastAPI serving the static build, and make the database reset portable.

**R5. Board validation has no size limits.** `models.py` checks structure well, which protects Part 9's AI updates, but titles, details and the number of cards are unbounded.
Action: add `max_length` to `Title` and `details`, and a maximum card count, before Part 9.

**R6. Empty details are handled differently in the UI and the API.** The UI replaces empty details with "No details yet." (`KanbanBoard.tsx:82`). The API and, later, the AI can store an empty string, and the UI then renders an empty paragraph.
Action: pick one rule. Either store `""` and show the placeholder only in rendering, or require non-empty details in the model.

### Low

**R7. Every `GET /api/board` writes to the database.** `db.get_board` runs `INSERT OR IGNORE` for both the user and the board on every read, which takes a write lock. This is harmless at MVP scale.
Action: seed when no row is found, or seed the hardcoded user at startup.

**R8. Housekeeping.** None of the backend has been committed yet: `backend/app`, `backend/tests`, `pyproject.toml`, `uv.lock`, `src/lib/api.ts` and the docs. The databases in `backend/data/` are correctly ignored by git. Add `httpx2` as a backend dev dependency to clear the pytest warning.

### Earlier findings still open

- H1: cards still cannot be edited.
- M1: no `KeyboardSensor`, and the Remove button sits inside the draggable card.
- M4: dropping a card in the gap between cards of its own column still moves it to the bottom (`kanban.ts:50-60`), with no test.
- M5: unit tests still miss the `moveCard` edge cases listed there.
- L2, L3, L5: `createId` still uses `Math.random`, `KanbanCardPreview` still repeats the card markup, and a column with one card still shows "1 cards".
- Part 1: `PLAN.md` is still the outline, and `frontend/AGENTS.md` does not exist.

## Accessibility (ADA) review

Date: 2026-11-16
Standard: WCAG 2.2 Level AA, the usual benchmark for ADA compliance on the web.
Method: manual review of the components and styles, and WCAG contrast ratios calculated from the color values in `globals.css`. No automated scanner (axe, Lighthouse) or screen reader test was run. A11 covers adding automated checks.

### Contrast results

| Pair | Ratio | Required | Where used | Result |
|---|---|---|---|---|
| Gray `#888888` on white | 3.54:1 | 4.5:1 | Card details, card counts, header copy, Remove button, details textarea text | **Fail** |
| Gray `#888888` on surface `#f7f8fb` | 3.34:1 | 4.5:1 | "Focus" label, "Loading board..." | **Fail** |
| Blue `#209dd7` on white | 3.06:1 | 4.5:1 | "Add a card" button text (12px) | **Fail** |
| Blue `#209dd7` on surface | 2.88:1 | 4.5:1 | "One board. Five columns." (18px semibold, not large enough to use the 3:1 rule) | **Fail** |
| Yellow `#ecad0a` on white | 1.99:1 | 3:1 (non-text) | Drop-target ring while dragging | **Fail** |
| White on purple `#753991` | 7.63:1 | 4.5:1 | "Add card" submit button | Pass |
| Navy `#032147` on white | 16.0:1 | 4.5:1 | Headings, titles | Pass |

### High

**A1. Text contrast is too low (WCAG 1.4.3).** The gray and blue text colors fail 4.5:1 on both backgrounds, and most secondary text in the app uses them.
Action: keep the brand colors for accents, and use darker shades for text. For example, a gray of `#6b6b6b` or darker on white (about 5.3:1), and a blue of about `#0b6e99` for text. Add them as new variables in `globals.css` (for example `--gray-text-strong`), so `pm/AGENTS.md` colors stay as they are for non-text use.

**A2. Cards cannot be moved without a pointer (WCAG 2.1.1 Keyboard, 2.5.7 Dragging Movements).** Only `PointerSensor` is registered. Keyboard users can focus a card but not move it, and there is no single-click alternative to dragging. Also, the `useSortable` attributes add `aria-describedby` instructions telling screen reader users to press space to pick a card up, which does nothing. This extends M1.
Action: add `KeyboardSensor` with `sortableKeyboardCoordinates`. Also add a non-drag way to move a card, such as a "Move to" menu on each card.

**A3. The column title input has no visible focus (WCAG 2.4.7 Focus Visible).** `KanbanColumn.tsx:58` sets `outline-none` with no `focus:` style, so keyboard users cannot see they are in the field. It also looks like plain text, so nothing shows that it can be edited.
Action: add a visible `focus-visible` ring or underline, with at least 3:1 contrast.

**A4. New card fields have no labels (WCAG 1.3.1, 3.3.2, 4.1.2).** `NewCardForm.tsx` uses only `placeholder` for "Card title" and "Details". Placeholders disappear while typing, and screen readers do not reliably read them as names.
Action: add `<label>` elements (they can be visually hidden) or `aria-label`.

**A5. A button sits inside an element with role button (WCAG 4.1.2).** The draggable `<article>` gets `role="button"`, and the Remove `<button>` is inside it (see M1). Screen readers may not expose the inner button properly.
Action: put `attributes` and `listeners` on a separate drag handle, or move Remove outside the draggable element.

**A6. Remove button's accessible name does not contain its visible text (WCAG 2.5.3 Label in Name).** The visible text is "Remove" but `aria-label` is "Delete {title}". Voice control users who say "click Remove" will not reach it.
Action: use `aria-label={`Remove ${card.title}`}`.

### Medium

**A7. Heading levels skip (WCAG 1.3.1).** The page has an `h1`, then card titles as `h4`, with no `h2` or `h3`. Column titles are inputs, so columns have no heading at all.
Action: make each column a section with an `h2` (it can be visually hidden, or the input can be labelled by it) and card titles `h3`.

**A8. Status changes are not announced (WCAG 4.1.3 Status Messages).** "Loading board...", a failed save or reload (R1-R3), and the card count changes are not in a live region.
Action: render loading and error messages in an element with `role="status"` (or `role="alert"` for errors).

**A9. Focus is lost after deleting a card or closing the new card form.** The focused element disappears, so focus falls back to `<body>`, and keyboard users have to start from the top again.
Action: after deleting, move focus to the next card or the column's "Add a card" button. After Cancel or submit, return focus to "Add a card".

**A10. The drop-target ring is too faint (WCAG 1.4.11 Non-text Contrast).** The yellow ring is 1.99:1 against white. It only appears while dragging, so it is lower priority.
Action: use a darker ring, or add a second visual cue such as a background tint.

### Low

**A11. No automated accessibility checks.** Add `@axe-core/playwright` and one e2e test that scans the loaded board, so regressions are caught.

**A12. Motion.** Card and column transitions ignore `prefers-reduced-motion`. Add Tailwind `motion-reduce:transition-none` to the animated elements.

## SEO review

Date: 2026-11-16
Context: this is a private, single-user app, and from Part 4 it sits behind a login. Search ranking is not a goal, so the main SEO concern is keeping the app out of search results, plus basic page metadata.

What is already right: `layout.tsx` sets `<html lang="en">`, a `title` and a `description`. Next.js adds the viewport meta tag. `next/font` hosts the fonts with the app, which avoids extra requests and font loading problems.

**S1. Nothing tells search engines not to index the app (Medium, from Part 4).** Once the app is deployed anywhere public, the login page could be indexed.
Action: in Part 4, set `robots: { index: false, follow: false }` in `metadata` in `layout.tsx`, and add `src/app/robots.ts` that disallows `/`. With `output: "export"` this builds a static `robots.txt` that FastAPI serves.

**S2. Template assets are still in use (Low).** `src/app/favicon.ico` is the default Next.js icon. `public/` holds unused template files (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`).
Action: delete the unused files and add an app icon.

**S3. Page content appears only after loading (Low).** The static page shows only "Loading board..." until `/api/board` returns. Search engines would see no content, which does not matter for a private app. The board then replaces the short loading text, which causes a large layout shift (Cumulative Layout Shift, a Core Web Vitals metric).
Action: render a skeleton the size of the board while loading. No server rendering is needed.
