import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path

from app.seed import SEED_BOARD

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "kanban.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY,
  username   TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def db_path() -> Path:
    return Path(os.environ.get("DB_PATH", DEFAULT_DB_PATH))


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path())
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    db_path().parent.mkdir(parents=True, exist_ok=True)
    with closing(connect()) as conn, conn:
        conn.executescript(SCHEMA)


def _user_id(conn: sqlite3.Connection, username: str) -> int:
    conn.execute("INSERT OR IGNORE INTO users (username) VALUES (?)", (username,))
    return conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()[0]


def get_board(username: str) -> dict:
    """Return the user's board, creating the user and a seeded board on first access."""
    with closing(connect()) as conn, conn:
        user_id = _user_id(conn, username)
        conn.execute(
            "INSERT OR IGNORE INTO boards (user_id, data) VALUES (?, ?)",
            (user_id, json.dumps(SEED_BOARD)),
        )
        row = conn.execute("SELECT data FROM boards WHERE user_id = ?", (user_id,)).fetchone()
    return json.loads(row[0])


def save_board(username: str, board: dict) -> None:
    with closing(connect()) as conn, conn:
        user_id = _user_id(conn, username)
        conn.execute(
            """
            INSERT INTO boards (user_id, data) VALUES (?, ?)
            ON CONFLICT (user_id) DO UPDATE
              SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, json.dumps(board)),
        )
