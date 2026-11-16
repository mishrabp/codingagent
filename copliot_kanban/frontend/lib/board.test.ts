import { describe, expect, it } from "vitest";
import {
  addCard,
  createInitialBoard,
  deleteCard,
  moveCard,
  renameColumn,
} from "./board";

describe("kanban board helpers", () => {
  it("creates a board with five default columns", () => {
    const board = createInitialBoard();

    expect(board.columns).toHaveLength(5);
    expect(board.columns.map((column) => column.title)).toEqual([
      "To do",
      "In Progress",
      "Review",
      "Blocked",
      "Done",
    ]);
  });

  it("moves a card from one column to another", () => {
    const board = createInitialBoard();
    const movingCard = board.columns[0].cards[0];

    const nextBoard = moveCard(board, {
      cardId: movingCard.id,
      fromColumnId: board.columns[0].id,
      toColumnId: board.columns[1].id,
    });

    expect(nextBoard.columns[0].cards.some((card) => card.id === movingCard.id)).toBe(false);
    expect(nextBoard.columns[1].cards.some((card) => card.id === movingCard.id)).toBe(true);
  });

  it("adds a card to the selected column and deletes it", () => {
    const board = createInitialBoard();
    const nextBoard = addCard(board, board.columns[0].id, {
      title: "New task",
      details: "Ship it",
    });

    expect(nextBoard.columns[0].cards.at(-1)).toMatchObject({
      title: "New task",
      details: "Ship it",
    });

    const deletedBoard = deleteCard(nextBoard, board.columns[0].id, nextBoard.columns[0].cards.at(-1)!.id);
    expect(deletedBoard.columns[0].cards.some((card) => card.title === "New task")).toBe(false);
  });

  it("renames a column", () => {
    const board = createInitialBoard();

    const renamed = renameColumn(board, board.columns[0].id, "Backlog");

    expect(renamed.columns[0].title).toBe("Backlog");
  });
});
