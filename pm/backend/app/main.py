from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from app import db
from app.models import Board


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(lifespan=lifespan)


def current_user() -> str:
    # Replaced by the session lookup when sign-in is added (PLAN.md Part 4).
    return "user"


@app.get("/api/board")
def read_board(username: str = Depends(current_user)) -> Board:
    return Board.model_validate(db.get_board(username))


@app.put("/api/board")
def update_board(board: Board, username: str = Depends(current_user)) -> Board:
    db.save_board(username, board.model_dump())
    return board
