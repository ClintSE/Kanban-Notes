"use client";

import React from 'react';
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
  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided: DraggableProvided, _snapshot: DraggableStateSnapshot) => (
        <div {...provided.draggableProps} ref={provided.innerRef} className="w-80 bg-gray-100 dark:bg-gray-900 rounded-md p-3">
          <div className="flex items-center justify-between mb-3" {...provided.dragHandleProps}>
            <h3 className="font-semibold">{column.title}</h3>
            <span className="text-xs text-gray-500">{cards.length}</span>
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
