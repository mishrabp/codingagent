import pytest
from pydantic import ValidationError

from app.models import Board


def test_seed_board_is_valid(board):
    Board.model_validate(board)


def test_titles_are_stripped(board):
    board["cards"]["card-1"]["title"] = "  Padded  "
    assert Board.model_validate(board).cards["card-1"].title == "Padded"


def dangling_card_id(b):
    b["columns"][0]["cardIds"].append("card-missing")


def card_in_two_columns(b):
    b["columns"][1]["cardIds"].append("card-1")


def card_in_no_column(b):
    b["columns"][0]["cardIds"].remove("card-1")


def duplicate_in_column(b):
    b["columns"][0]["cardIds"].append("card-1")


def missing_column(b):
    b["columns"].pop()


def extra_column(b):
    b["columns"].append({"id": "col-extra", "title": "Extra", "cardIds": []})


def reordered_columns(b):
    b["columns"].reverse()


def empty_column_title(b):
    b["columns"][0]["title"] = "   "


def empty_card_title(b):
    b["cards"]["card-1"]["title"] = ""


def key_mismatch(b):
    b["cards"]["card-1"]["id"] = "card-other"


INVALID = [
    dangling_card_id,
    card_in_two_columns,
    card_in_no_column,
    duplicate_in_column,
    missing_column,
    extra_column,
    reordered_columns,
    empty_column_title,
    empty_card_title,
    key_mismatch,
]


@pytest.mark.parametrize("mutate", INVALID, ids=lambda f: f.__name__)
def test_invalid_boards_are_rejected(board, mutate):
    mutate(board)
    with pytest.raises(ValidationError):
        Board.model_validate(board)
