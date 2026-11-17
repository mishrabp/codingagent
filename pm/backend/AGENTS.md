# Backend

FastAPI app persisting each user's Kanban board in SQLite. See `docs/BACKEND_PLAN.md`.

## Commands

```bash
uv run uvicorn app.main:app --reload --port 8000   # dev server
uv run pytest                                      # all tests
uv run pytest tests/test_api.py -k restart         # single test
```

## Code

- `app/main.py`: app, lifespan (`db.init_db()`), `current_user` (returns "user" until sign-in exists), `GET`/`PUT /api/board`.
- `app/db.py`: stdlib `sqlite3`, one connection per operation. Tables `users` and `boards` (one board per user, stored as JSON text in `boards.data`). `get_board` creates the user and a seeded board on first access.
- `app/models.py`: Pydantic `Board`, `Column`, `Card`, matching the frontend `BoardData`. The validator requires the five fixed column ids in order, card keys equal to card ids, and every card in exactly one column. Titles are stripped and must be non-empty.
- `app/seed.py`: the seed board.
- The database path is `DB_PATH`, default `backend/data/kanban.db` (gitignored). Tests use a temporary database.
