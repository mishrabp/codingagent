import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import type { BoardData } from "@/lib/kanban";

const testBoard: BoardData = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1"] },
    { id: "col-discovery", title: "Discovery", cardIds: [] },
    { id: "col-progress", title: "In Progress", cardIds: [] },
    { id: "col-review", title: "Review", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "First card", details: "Details" },
  },
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === "PUT"
      ? new Response(init.body)
      : Response.json(structuredClone(testBoard))
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderBoard = async () => {
  render(<KanbanBoard />);
  return screen.findAllByTestId(/column-/i);
};

const savedBoards = (): BoardData[] =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(init.body));

describe("KanbanBoard", () => {
  it("loads the board from the backend", async () => {
    const columns = await renderBoard();
    expect(columns).toHaveLength(5);
    expect(screen.getByText("First card")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/board");
  });

  it("saves a column rename when the input loses focus", async () => {
    const [column] = await renderBoard();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(savedBoards()).toHaveLength(0);

    await userEvent.tab();
    await waitFor(() => expect(savedBoards()).toHaveLength(1));
    expect(savedBoards()[0].columns[0].title).toBe("New Name");
  });

  it("reverts an empty column title without saving", async () => {
    const [column] = await renderBoard();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.keyboard("{Enter}");
    expect(within(column).getByLabelText("Column title")).toHaveValue("Backlog");
    expect(savedBoards()).toHaveLength(0);
  });

  it("adds and removes a card, saving each change", async () => {
    const [column] = await renderBoard();
    await userEvent.click(
      within(column).getByRole("button", { name: /add a card/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/card title/i),
      "New card"
    );
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();
    await waitFor(() => expect(savedBoards()).toHaveLength(1));
    const added = Object.values(savedBoards()[0].cards).find(
      (card) => card.title === "New card"
    );
    expect(added).toBeDefined();
    expect(savedBoards()[0].columns[0].cardIds).toContain(added!.id);

    await userEvent.click(
      within(column).getByRole("button", { name: /delete new card/i })
    );
    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
    await waitFor(() => expect(savedBoards()).toHaveLength(2));
    expect(savedBoards()[1].cards[added!.id]).toBeUndefined();
  });

  it("reloads the board when a save is rejected", async () => {
    const [column] = await renderBoard();
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "PUT"
        ? new Response(null, { status: 422 })
        : Response.json(structuredClone(testBoard))
    );
    await userEvent.click(
      within(column).getByRole("button", { name: /delete first card/i })
    );
    expect(await screen.findByText("First card")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
