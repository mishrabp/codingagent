export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

export type Board = {
  columns: Column[];
};

export type MoveCardInput = {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
};

export const DEFAULT_COLUMN_TITLES = [
  "To do",
  "In Progress",
  "Review",
  "Blocked",
  "Done",
] as const;

const createCardId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `card-${crypto.randomUUID()}`;
  }

  return `card-${Math.random().toString(16).slice(2)}`;
};

export function createInitialBoard(): Board {
  const columns: Column[] = DEFAULT_COLUMN_TITLES.map((title, index) => ({
    id: `column-${index + 1}`,
    title,
    cards: [],
  }));

  const seedCards: Record<string, Card[]> = {
    "column-1": [
      { id: "card-1", title: "Draft project brief", details: "Outline goals, scope, and success metrics for the launch." },
      { id: "card-2", title: "Audit onboarding flow", details: "Check the first-run experience and identify friction points." },
    ],
    "column-2": [
      { id: "card-3", title: "Confirm handoff states", details: "Map out the passing of ownership between design and engineering." },
    ],
    "column-3": [
      { id: "card-4", title: "Prepare release notes", details: "Summarize the highlights and known caveats before shipping." },
    ],
    "column-4": [
      { id: "card-5", title: "Resolve QA blocker", details: "Investigate the chart rendering issue on the dashboard view." },
    ],
    "column-5": [
      { id: "card-6", title: "Approve final copy", details: "Lock the page messaging before the public-facing launch." },
    ],
  };

  return {
    columns: columns.map((column) => ({
      ...column,
      cards: seedCards[column.id] ?? [],
    })),
  };
}

export function renameColumn(board: Board, columnId: string, newTitle: string): Board {
  const trimmedTitle = newTitle.trim();

  if (!trimmedTitle) {
    return board;
  }

  return {
    ...board,
    columns: board.columns.map((column) =>
      column.id === columnId ? { ...column, title: trimmedTitle } : column,
    ),
  };
}

export function addCard(
  board: Board,
  columnId: string,
  payload: { title: string; details: string },
): Board {
  const title = payload.title.trim();
  const details = payload.details.trim();

  if (!title) {
    return board;
  }

  return {
    ...board,
    columns: board.columns.map((column) => {
      if (column.id !== columnId) {
        return column;
      }

      return {
        ...column,
        cards: [
          ...column.cards,
          {
            id: createCardId(),
            title,
            details,
          },
        ],
      };
    }),
  };
}

export function deleteCard(board: Board, columnId: string, cardId: string): Board {
  return {
    ...board,
    columns: board.columns.map((column) => {
      if (column.id !== columnId) {
        return column;
      }

      return {
        ...column,
        cards: column.cards.filter((card) => card.id !== cardId),
      };
    }),
  };
}

export function moveCard(board: Board, input: MoveCardInput): Board {
  const { cardId, fromColumnId, toColumnId } = input;

  if (fromColumnId === toColumnId) {
    return board;
  }

  const fromColumn = board.columns.find((column) => column.id === fromColumnId);
  const toColumn = board.columns.find((column) => column.id === toColumnId);

  if (!fromColumn || !toColumn) {
    return board;
  }

  const card = fromColumn.cards.find((item) => item.id === cardId);

  if (!card) {
    return board;
  }

  return {
    ...board,
    columns: board.columns.map((column) => {
      if (column.id === fromColumnId) {
        return {
          ...column,
          cards: column.cards.filter((item) => item.id !== cardId),
        };
      }

      if (column.id === toColumnId) {
        return {
          ...column,
          cards: [...column.cards, card],
        };
      }

      return column;
    }),
  };
}
