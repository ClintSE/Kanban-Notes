import React, { useState } from 'react';
import type { Card as CardType } from '../types';

export default function Card({ card, onEdit, onDelete }: { card: CardType; onEdit?: (c: CardType) => void; onDelete?: (id: string) => void }): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');

  function save() {
    const updated = { ...card, title, description };
    onEdit?.(updated);
    setEditing(false);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 shadow-sm border border-gray-200 dark:border-gray-700">
      {!editing ? (
        <>
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="font-medium text-sm">{card.title}</div>
              {card.description && <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{card.description}</div>}
            </div>
            <div className="flex gap-2">
              <button className="text-xs text-blue-600" onClick={() => setEditing(true)}>Edit</button>
              <button className="text-xs text-red-600" onClick={() => onDelete?.(card.id)}>Delete</button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <input className="w-full p-1 border rounded" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="w-full p-1 border rounded" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => setEditing(false)}>Cancel</button>
            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={save}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
