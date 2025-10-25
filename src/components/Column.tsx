"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Droppable, Draggable, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import CardComponent from './Card';
import type { Column, Card as CardType } from '../types';

type ColumnProps = {
  column: Column;
  cards: CardType[];
  index: number;
  onAdd?: (colId: string, title: string) => void;
  onEdit?: (card: CardType) => void;
  onDelete?: (id: string) => void;
};

export default function Column({ column, cards, index, onAdd, onEdit, onDelete }: ColumnProps): React.ReactElement {
  const colorClasses = [
    'bg-rose-50 dark:bg-rose-900/30',
    'bg-yellow-50 dark:bg-yellow-900/30',
    'bg-sky-50 dark:bg-sky-900/30',
    'bg-emerald-50 dark:bg-emerald-900/30',
    'bg-violet-50 dark:bg-violet-900/30',
    'bg-gray-50 dark:bg-gray-900/30',
  ];
  const bgClass = colorClasses[index % colorClasses.length];

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showAdd) inputRef.current?.focus();
  }, [showAdd]);

  function openAdd() {
    setShowAdd(true);
  }

  function closeAdd() {
    setShowAdd(false);
    setTitle('');
  }

  async function submitAdd(e?: React.FormEvent) {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (onAdd) await onAdd(column.id, t);
    closeAdd();
  }

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided: DraggableProvided, _snapshot: DraggableStateSnapshot) => (
  <div {...provided.draggableProps} ref={provided.innerRef} className={`group relative w-80 ${bgClass} border border-gray-200 dark:border-gray-700 rounded-md p-3`}>
          <div className="flex items-center justify-between mb-3 " {...provided.dragHandleProps}>
            <h3 className="font-semibold">{column.title}</h3>
            <span className="text-xs text-gray-500">{cards.length}</span>
          </div>

          {/* Add task button shown on hover */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 ">
            <button
              type="button"
              onClick={openAdd}
              aria-expanded={showAdd}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/90 dark:bg-black/70 border border-gray-300 dark:border-gray-600 text-sm px-3 py-1 rounded shadow cursor-pointer"
            >
              + Add task
            </button>

            {/* popup form */}
            <div className={`origin-top mt-2 w-64 left-1/2 -translate-x-1/2 absolute z-20 ${showAdd ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'} transition-all duration-150`}>
              <form onSubmit={submitAdd} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 shadow-lg">
                <label className="sr-only">New task title</label>
                <input
                  ref={inputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') closeAdd();
                  }}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Task title"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={closeAdd} className="text-sm px-2 py-1 rounded text-gray-600 dark:text-gray-300">Cancel</button>
                  <button type="submit" className="bg-indigo-600 text-white text-sm px-3 py-1 rounded">Add</button>
                </div>
              </form>
            </div>
          </div>

          <Droppable droppableId={column.id} type="CARD">
            {(dropProvided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className={`space-y-2 min-h-[50px] ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/50' : ''} p-1 rounded`}> 
                {cards.map((c, i) => (
                  <Draggable key={c.id} draggableId={c.id} index={i}>
                    {(cardProvided: DraggableProvided, _cardSnapshot: DraggableStateSnapshot) => (
                      <div ref={cardProvided.innerRef} {...cardProvided.draggableProps} {...cardProvided.dragHandleProps}>
                        <CardComponent card={c} onEdit={onEdit} onDelete={onDelete} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
}
