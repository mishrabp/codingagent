"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import {
  addCard,
  createInitialBoard,
  deleteCard,
  moveCard,
  renameColumn,
  type Board,
  type Card,
  type Column,
} from "@/lib/board";

export default function Home() {
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) {
      return;
    }

    const cardId = String(active.id);
    const dragColumn = board.columns.find((column) =>
      column.cards.some((card) => card.id === cardId),
    );
    const targetColumn =
      board.columns.find((column) => column.id === String(over.id)) ??
      board.columns.find((column) =>
        column.cards.some((card) => card.id === String(over.id)),
      );

    if (!dragColumn || !targetColumn || dragColumn.id === targetColumn.id) {
      return;
    }

    setBoard((current) =>
      moveCard(current, {
        cardId,
        fromColumnId: dragColumn.id,
        toColumnId: targetColumn.id,
      }),
    );
  };

  const handleRenameColumn = (columnId: string, nextTitle: string) => {
    setBoard((current) => renameColumn(current, columnId, nextTitle));
  };

  const handleAddCard = (columnId: string, payload: { title: string; details: string }) => {
    setBoard((current) => addCard(current, columnId, payload));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard((current) => deleteCard(current, columnId, cardId));
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Project Workspace</p>
          <h1>Project Board</h1>
        </div>
        <div className="topbar-badge">Single Board</div>
      </header>

      {isMounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <main className="board-grid" aria-label="Kanban board">
            {board.columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </main>
        </DndContext>
      ) : (
        <main className="board-grid" aria-label="Kanban board">
          {board.columns.map((column) => (
            <BoardColumnPreview key={column.id} column={column} />
          ))}
        </main>
      )}
    </div>
  );
}

type BoardColumnProps = {
  column: Column;
  onRename: (columnId: string, nextTitle: string) => void;
  onAddCard: (columnId: string, payload: { title: string; details: string }) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

function BoardColumnPreview({ column }: { column: Column }) {
  return (
    <section className="board-column">
      <div className="column-header">
        <input aria-label={`${column.title} column title`} value={column.title} readOnly />
        <span>{column.cards.length}</span>
      </div>

      <div className="card-list">
        {column.cards.map((card) => (
          <article key={card.id} className="kanban-card">
            <div className="card-content">
              <h3>{card.title}</h3>
              {card.details ? <p>{card.details}</p> : null}
            </div>
            <button type="button" className="delete-card" aria-label={`Delete ${card.title}`}>
              ×
            </button>
          </article>
        ))}
      </div>

      <div className="composer">
        <input aria-label={`Add a card to ${column.title}`} placeholder="Task title" readOnly />
        <textarea aria-label={`Details for ${column.title}`} placeholder="Add details" readOnly />
        <button type="button">Add card</button>
      </div>
    </section>
  );
}

function BoardColumn({ column, onRename, onAddCard, onDeleteCard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [draft, setDraft] = useState({ title: "", details: "" });

  const submitCard = () => {
    if (!draft.title.trim()) {
      return;
    }

    onAddCard(column.id, {
      title: draft.title,
      details: draft.details,
    });

    setDraft({ title: "", details: "" });
  };

  return (
    <section ref={setNodeRef} className={`board-column ${isOver ? "column-over" : ""}`}>
      <div className="column-header">
        <input
          aria-label={`${column.title} column title`}
          value={column.title}
          onChange={(event) => onRename(column.id, event.target.value)}
        />
        <span>{column.cards.length}</span>
      </div>

      <div className="card-list">
        {column.cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onDelete={() => onDeleteCard(column.id, card.id)}
          />
        ))}
      </div>

      <div className="composer">
        <input
          aria-label={`Add a card to ${column.title}`}
          placeholder="Task title"
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
        />
        <textarea
          aria-label={`Details for ${column.title}`}
          placeholder="Add details"
          value={draft.details}
          onChange={(event) =>
            setDraft((current) => ({ ...current, details: event.target.value }))
          }
        />
        <button type="button" onClick={submitCard}>
          Add card
        </button>
      </div>
    </section>
  );
}

type KanbanCardProps = {
  card: Card;
  onDelete: () => void;
};

function KanbanCard({ card, onDelete }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDragging ? "is-dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-content">
        <h3>{card.title}</h3>
        {card.details ? <p>{card.details}</p> : null}
      </div>
      <button
        type="button"
        className="delete-card"
        aria-label={`Delete ${card.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        ×
      </button>
    </article>
  );
}
