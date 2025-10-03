"use client";

import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, DropResult, DroppableProvided } from 'react-beautiful-dnd';
import ColumnComponent from './Column';
import type { Column, Card } from '../types';
import { supabase, fetchBoard, upsertCards, upsertCard, deleteCard } from '../lib/supabaseClient';

function generateId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

const initialColumns: Column[] = [
  { id: 'col-1', title: 'To do', position: 0 },
  { id: 'col-2', title: 'In progress', position: 1 },
  { id: 'col-3', title: 'Done', position: 2 },
];

const initialCards: Card[] = [
  { id: 'card-1', title: 'Sample task', description: 'This is a sample note', columnId: 'col-1', position: 0 },
  { id: 'card-2', title: 'Another task', description: '', columnId: 'col-1', position: 1 },
];

export default function Board(): React.ReactElement {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [cards, setCards] = useState<Card[]>(initialCards);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetchBoard();
        if (!mounted) return;
        if (res.columns.length) setColumns(res.columns);
        if (res.cards.length) setCards(res.cards);
      } catch (e) {
        // ignore - keep using initial sample data
      }
    }
    load();
    function onRefresh() { load(); }
    window.addEventListener('kanban:refresh', onRefresh as EventListener);
    return () => { mounted = false; window.removeEventListener('kanban:refresh', onRefresh as EventListener); };
  }, []);

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    (async () => {
      const prev = cards;
      const card = prev.find((c) => c.id === draggableId)!;
      const newCards = prev.filter((c) => c.id !== draggableId);
      const moved = { ...card, columnId: destination.droppableId, position: destination.index };
      newCards.splice(destination.index, 0, moved);
      const updated = newCards.map((c, idx) => ({ ...c, position: idx }));
      setCards(updated);
      try {
        const { error } = await upsertCards(updated);
        if (error) throw error;
      } catch (e) {
        // on error, reload authoritative state
        try {
          const res = await fetchBoard();
          setColumns(res.columns);
          setCards(res.cards);
        } catch (_err) {
          // ignore
        }
      }
    })();
  }

  async function addCard(columnId: string, title: string) {
    const newCard: Card = { id: generateId(), title, description: '', columnId, position: cards.filter(c => c.columnId === columnId).length };
    const prev = cards;
    setCards((p) => [...p, newCard]);
    try {
      const { error } = await upsertCard(newCard);
      if (error) throw error;
    } catch (e) {
      // revert on failure
      setCards(prev);
      try {
        const res = await fetchBoard();
        setColumns(res.columns);
        setCards(res.cards);
      } catch (_err) {}
    }
  }

  async function editCard(card: Card) {
    const prev = cards;
    setCards((p) => p.map((c) => (c.id === card.id ? card : c)));
    try {
      const { error } = await upsertCard(card);
      if (error) throw error;
    } catch (e) {
      // revert on failure
      setCards(prev);
      try {
        const res = await fetchBoard();
        setColumns(res.columns);
        setCards(res.cards);
      } catch (_err) {}
    }
  }

  async function removeCard(id: string) {
    const prev = cards;
    setCards((p) => p.filter((c) => c.id !== id));
    try {
      const { error } = await deleteCard(id);
      if (error) throw error;
    } catch (e) {
      // revert
      setCards(prev);
      try {
        const res = await fetchBoard();
        setColumns(res.columns);
        setCards(res.cards);
      } catch (_err) {}
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto py-6">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
          {(provided: DroppableProvided) => (
            <div className="flex" ref={provided.innerRef} {...provided.droppableProps}>
              {columns.map((col, i) => (
                <ColumnComponent key={col.id} column={col} cards={cards.filter((c) => c.columnId === col.id).sort((a,b)=>a.position-b.position)} index={i} onAdd={addCard} onEdit={editCard} onDelete={removeCard} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
