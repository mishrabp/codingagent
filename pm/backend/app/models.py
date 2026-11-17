from typing import Annotated, Self

from pydantic import BaseModel, StringConstraints, model_validator

COLUMN_IDS = ["col-backlog", "col-discovery", "col-progress", "col-review", "col-done"]

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class Card(BaseModel):
    id: str
    title: Title
    details: str


class Column(BaseModel):
    id: str
    title: Title
    cardIds: list[str]


class Board(BaseModel):
    columns: list[Column]
    cards: dict[str, Card]

    @model_validator(mode="after")
    def check_consistency(self) -> Self:
        if [column.id for column in self.columns] != COLUMN_IDS:
            raise ValueError(f"columns must be exactly {COLUMN_IDS} in order")
        for key, card in self.cards.items():
            if key != card.id:
                raise ValueError(f"card key {key!r} does not match id {card.id!r}")
        placed = [card_id for column in self.columns for card_id in column.cardIds]
        if sorted(placed) != sorted(self.cards):
            raise ValueError("every card must appear in exactly one column, exactly once")
        return self
