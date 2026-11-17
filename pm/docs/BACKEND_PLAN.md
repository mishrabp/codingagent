# Backend Persistence Plan

Status: implemented (backend and frontend integration). Docker volume waits for Part 2, the session-based user for Part 4.
Covers: PLAN.md Part 5 (database modeling) and Part 6 (backend API), plus seed data. It also sets up what Part 7 (frontend uses the API) and Part 9 (AI board updates) need.

## Prerequisites

- Part 2: `backend/` is a uv project with a FastAPI app.
- Part 4: there is a login session that identifies the current user.

Part 2 and Part 4 are not done yet, so this work was built on its own: `backend/` is a minimal uv project with only the board API, and the `current_user` dependency returns `"user"` until Part 4 replaces it.

## Storage

All persistent data lives in a single SQLite database file (`kanban.db`). It has two tables, `users` and `boards`; a board's columns and cards are stored inside its `boards` row. There is no other storage: nothing is written to JSON files or browser storage, and the server keeps no board state in memory. Every read comes from SQLite and every change is written to SQLite before the API responds. While a page is open, the frontend holds the board in React state to render it.

## Decisions

1. **Store each board as one row in the SQLite `boards` table.** That row's `data` column holds the frontend `BoardData` shape, `{ columns, cards }`, serialized as JSON text.
   - Why: the frontend already holds the whole board in one state object, and Part 9 has the AI return a whole updated board. Storing the same shape means no mapping layer and one read or write per request.
   - Not chosen: separate `columns` and `cards` tables with position fields. They only pay off for per-card queries or concurrent editors, and the MVP has neither.
2. **SQLite is the database, accessed through Python's built-in `sqlite3` module, with no ORM.** Two tables and a few queries do not justify SQLAlchemy.
3. **Whole-board save.** `PUT /api/board` replaces the board after validation. Each user action sends the full board, which is a few KB.
4. **The client generates ids**, as it does today with `createId`. Moving `createId` to `crypto.randomUUID()` is review item L2. Because the board is a single document, the database does not need to assign card ids.
5. **The backend validates every write.** This covers review item M3 and also protects against bad AI output in Part 9.
6. **Seed on first access.** Startup only creates the tables. The first time a user's board is read, the user row and a seeded board are created. Restarts never overwrite saved data. To reset, delete the database file.
7. **Database location:** set by the `DB_PATH` environment variable. The default is `backend/data/kanban.db`, resolved from the code's location (`Path(__file__)`), not from the folder the server is started in. In Docker it is `/app/data/kanban.db` on a named volume, so data survives container rebuilds. `backend/data/` is in `.gitignore`.

## Schema

The JSON copy for Part 5 sign-off is in `docs/database_schema.json`.

```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY,
  username   TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,  -- BoardData JSON
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- `UNIQUE(user_id)` enforces one board per user. Dropping that constraint later is enough to allow several boards per user.
- There is no password column, because the MVP credentials are hardcoded (Part 4). A `password_hash` column can be added when real authentication arrives.
- Run `PRAGMA foreign_keys = ON` on each connection.
- `connect()` opens a new connection for each operation. FastAPI runs plain `def` routes on a thread pool, and a `sqlite3` connection may only be used on the thread that opened it.
- `save_board` sets `updated_at = CURRENT_TIMESTAMP` itself; the column default only applies on insert.

## Board document and validation rules

Pydantic models mirror `src/lib/kanban.ts`:

```python
class Card(BaseModel):
    id: str
    title: Title  # str, whitespace stripped, min_length=1
    details: str

class Column(BaseModel):
    id: str
    title: Title
    cardIds: list[str]

class Board(BaseModel):
    columns: list[Column]
    cards: dict[str, Card]
```

A model validator on `Board` checks the following:
- The column ids are exactly the five fixed ids, in order: `col-backlog`, `col-discovery`, `col-progress`, `col-review`, `col-done`. Columns can be renamed but not added, removed or reordered.
- Every id in any `cardIds` exists in `cards`.
- Every card appears in exactly one column, exactly once.
- For each card, the key in `cards` equals that card's `id`.

## Seed data

`backend/app/seed.py` holds `SEED_BOARD`, which is the current frontend `initialData`: five columns and eight cards with the same ids.
- The same ids mean the existing e2e tests (`card-card-1`, `column-col-review`) keep working when the frontend moves to the backend in Part 7.
- In Part 7, `initialData` is deleted from the frontend, so the backend is the only source of seed data.
- Any user gets the seed board on first access, so the `user` login sees it on a new database.

## API

All routes act on the current user's single board.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/board` | none | 200 `Board` |
| PUT | `/api/board` | `Board` | 200 `Board` (as saved). 422 if validation fails, and the stored board is unchanged |

A missing session returns 401 once Part 4's dependency is in place.

## Frontend integration (Part 7)

- `src/lib/api.ts` has `fetchBoard()` and `saveBoard()`. `KanbanBoard` loads the board on mount and shows "Loading board..." until it arrives.
- Every change updates React state and queues a `PUT`. Saves run one at a time through a promise chain, so an older board can never overwrite a newer one.
- If a save is rejected, the frontend reloads the board from the backend so the page matches what is stored.
- Column titles save on blur or Enter, not on every keystroke (review item M2). An empty title reverts to the previous one.
- `initialData` is removed from the frontend; seed data lives only in `backend/app/seed.py`.
- In development, `next.config.ts` rewrites `/api/*` to `BACKEND_URL` (default `http://127.0.0.1:8000`). Part 3 replaces this when FastAPI serves the static build, because rewrites do not work with `output: "export"`.
- E2E (`playwright.config.ts`) starts its own backend on port 8100 with a fresh `data/e2e.db` and its own Next dev server on port 3100 (build folder `.next-e2e`), so it never touches the development database and can run beside your dev servers.
- Part 9 note: after the AI changes the board, the frontend must replace its state with the board the backend returns.

## File layout

```
backend/
  pyproject.toml        # Python >= 3.13; fastapi, uvicorn; dev: pytest, httpx
  app/
    main.py             # FastAPI app, lifespan calls db.init_db(), current_user, GET/PUT /api/board
    db.py               # connect(), init_db(), get_board() (seeds on first access), save_board()
    models.py           # Card, Column, Board and the consistency validator
    seed.py             # SEED_BOARD
  tests/
    conftest.py         # DB_PATH in tmp_path, TestClient, seed board copy
    test_models.py
    test_db.py
    test_api.py
  data/                 # gitignored, holds kanban.db
```

## Steps

- [x] 1. User approved executing this plan.
- [x] 2. Add `models.py` with the validator, plus unit tests for each rule.
- [x] 3. Add `seed.py`, plus a test that `SEED_BOARD` passes validation.
- [x] 4. Add `db.py`: create the schema, seed on first access, and get and save a board for a user.
- [x] 5. Call `init_db()` from the FastAPI lifespan, and read `DB_PATH` from the environment.
- [x] 6. Add the `GET` and `PUT /api/board` routes and the `current_user` dependency.
- [x] 7. Add `backend/data/` to `.gitignore`.
- [ ] 8. Mount a volume for `/app/data` in Docker and the start scripts (Part 2).
- [x] 9. Update `backend/AGENTS.md` to describe the backend.
- [x] 10. Run `uv run pytest` and confirm everything passes.
- [x] 11. Connect the frontend to the API, with tests (see Frontend integration).

## Tests

Use pytest with FastAPI `TestClient`, and give each test a fresh database in `tmp_path`.

- **Creation:** with no database file, startup creates the file, both tables, the user `user` and the seeded board.
- **Idempotent seed:** save a changed board, restart (a new app on the same file), and the changed board is still returned. Reading the board twice creates no duplicate users or boards.
- **Timestamp:** saving updates `updated_at`.
- **GET** returns the seed board for a new database.
- **Stored in SQLite:** after a PUT, a direct `sqlite3` query on the database file returns the new board JSON from `boards.data`.
- **PUT then GET** returns the updated board: a card moved between columns, a card reordered within a column, a card added, a card deleted, a column renamed and a card edited.
- **Persistence across restart:** PUT, create a new app instance, then GET returns the PUT data.
- **Validation returns 422 and leaves the stored board unchanged** for each of these: a dangling card id, a card in two columns, a card in no column, a duplicate id within a column, a missing, extra or reordered column, an empty column or card title, and a card whose key does not match its id.
- **Per-user isolation:** two users' boards are stored and returned independently (tested at the `db.py` level).
- **Frontend unit tests** (fetch mocked): load from the API, rename saves on blur only, an empty title reverts without saving, add and delete each save, a rejected save reloads the board.
- **E2E:** the existing load, add and move tests, plus a reload test showing an added card and a renamed column persist.

## Success criteria

- `uv run pytest` passes.
- Starting the app with no database creates it and serves the seeded board from `GET /api/board`.
- Board data is read from and written to the SQLite file only. Opening `kanban.db` with the `sqlite3` CLI shows the saved board in `boards.data`.
- Changes made through `PUT /api/board` survive a server restart and, in Docker, a container restart.
- An invalid board can never be stored.

## Decisions made at sign-off

1. Each board is stored as one SQLite row.
2. The seed data is the eight demo cards.
