import copy

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import SEED_BOARD


@pytest.fixture
def db_file(tmp_path, monkeypatch):
    path = tmp_path / "kanban.db"
    monkeypatch.setenv("DB_PATH", str(path))
    return path


@pytest.fixture
def client(db_file):
    with TestClient(app) as client:
        yield client


@pytest.fixture
def board():
    return copy.deepcopy(SEED_BOARD)
