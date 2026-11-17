import json
import sqlite3

from fastapi.testclient import TestClient

from app.main import app
from app.seed import SEED_BOARD


def test_startup_creates_database(db_file, client):
    assert db_file.exists()


def test_get_returns_seed_board(client):
    response = client.get("/api/board")
    assert response.status_code == 200
    assert response.json() == SEED_BOARD


def test_put_then_get_returns_updated_board(client, board):
    # Move card-1 to review, reorder progress, add a card, delete card-8,
    # rename a column and edit a card.
    board["columns"][0]["cardIds"].remove("card-1")
    board["columns"][3]["cardIds"].insert(0, "card-1")
    board["columns"][2]["cardIds"].reverse()
    board["cards"]["card-new"] = {"id": "card-new", "title": "New", "details": ""}
    board["columns"][1]["cardIds"].append("card-new")
    del board["cards"]["card-8"]
    board["columns"][4]["cardIds"].remove("card-8")
    board["columns"][4]["title"] = "Shipped"
    board["cards"]["card-2"]["details"] = "Edited"

    response = client.put("/api/board", json=board)
    assert response.status_code == 200
    assert response.json() == board
    assert client.get("/api/board").json() == board


def test_put_is_stored_in_sqlite(db_file, client, board):
    board["columns"][0]["title"] = "Stored"
    client.put("/api/board", json=board)
    data = sqlite3.connect(db_file).execute("SELECT data FROM boards").fetchone()[0]
    assert json.loads(data) == board


def test_board_survives_restart(db_file, board):
    board["columns"][0]["title"] = "Persisted"
    with TestClient(app) as client:
        client.put("/api/board", json=board)
    with TestClient(app) as client:
        assert client.get("/api/board").json() == board


def test_invalid_put_returns_422_and_keeps_board(client, board):
    board["columns"][0]["cardIds"].append("card-missing")
    response = client.put("/api/board", json=board)
    assert response.status_code == 422
    assert client.get("/api/board").json() == SEED_BOARD
