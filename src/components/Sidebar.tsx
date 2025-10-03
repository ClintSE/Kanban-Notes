"use client";

import React, { useEffect, useState } from 'react';
import { fetchBoard, upsertCard } from '../lib/supabaseClient';
import type { Column, Card } from '../types';

function generateId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

export default function Sidebar(): React.ReactElement {
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);

  async function load() {
    const res = await fetchBoard();
    setColumns(res.columns);
    setCards(res.cards);
  }

  useEffect(() => {
    load();
    function onRefresh() { load(); }
    window.addEventListener('kanban:refresh', onRefresh as EventListener);
    return () => window.removeEventListener('kanban:refresh', onRefresh as EventListener);
  }, []);

  const [title, setTitle] = useState('');
  const [targetCol, setTargetCol] = useState<string | null>(null);

  useEffect(() => {
    if (columns.length) setTargetCol(columns[0].id);
  }, [columns]);

  async function addNew() {
    if (!title.trim() || !targetCol) return;
    const pos = cards.filter(c => c.columnId === targetCol).length;
    const newCard: Card = { id: generateId(), title: title.trim(), description: '', columnId: targetCol, position: pos };
    const { error } = await upsertCard(newCard);
    if (!error) {
      setTitle('');
      window.dispatchEvent(new CustomEvent('kanban:refresh'));
    } else {
      alert('Failed to add note');
    }
  }

  return (
    <aside className="w-64 p-4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Notes</h2>
        <div className="space-y-2">
          <input className="w-full p-2 border rounded" placeholder="New note title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <select className="flex-1 p-2 border rounded" value={targetCol ?? ''} onChange={(e) => setTargetCol(e.target.value)}>
              {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={addNew}>Add</button>
          </div>
        </div>
      </div>
      <div className="space-y-4 overflow-y-auto max-h-[70vh]">
        {columns.map((col) => (
          <div key={col.id}>
            <h3 className="text-sm font-medium mb-2">{col.title}</h3>
            <ul className="space-y-1">
              {cards.filter(c => c.columnId === col.id).map(c => (
                <li key={c.id} className="text-sm text-gray-700 dark:text-gray-200">{c.title}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
