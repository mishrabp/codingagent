import sqlite3

from app import db
from app.seed import SEED_BOARD


def test_init_creates_database_and_tables(db_file):
    assert not db_file.exists()
    db.init_db()
    tables = {
        row[0]
        for row in sqlite3.connect(db_file).execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }
    assert {"users", "boards"} <= tables


def test_init_is_idempotent(db_file, board):
    db.init_db()
    board["columns"][0]["title"] = "Changed"
    db.save_board("user", board)
    db.init_db()
    assert db.get_board("user") == board


def test_first_access_seeds_board_once(db_file):
    db.init_db()
    assert db.get_board("user") == SEED_BOARD
    db.get_board("user")
    conn = sqlite3.connect(db_file)
    assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1
    assert conn.execute("SELECT COUNT(*) FROM boards").fetchone()[0] == 1


def test_save_updates_timestamp(db_file, board):
    db.init_db()
    db.get_board("user")
    conn = sqlite3.connect(db_file)
    conn.execute("UPDATE boards SET updated_at = '2000-01-01 00:00:00'")
    conn.commit()
    db.save_board("user", board)
    assert conn.execute("SELECT updated_at FROM boards").fetchone()[0] != "2000-01-01 00:00:00"


def test_users_have_separate_boards(db_file, board):
    db.init_db()
    board["columns"][0]["title"] = "Alice backlog"
    db.save_board("alice", board)
    assert db.get_board("alice")["columns"][0]["title"] == "Alice backlog"
    assert db.get_board("bob") == SEED_BOARD
