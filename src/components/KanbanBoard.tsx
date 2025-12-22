"use client";

import React, { useEffect, useRef, useState } from 'react';

const COLUMNS = ["All Tasks", "In Progress", "Review","Deployment", "Done"];

type Card = {
  title: string;
  assignee?: string;
  priority?: string;
  comments?: string;
};

export default function KanbanBoard(): React.ReactElement {
  const [state, setState] = useState<Record<string, Card[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('kanban') || '{}') || {};
    } catch {
      return {};
    }
  });
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentColumn, setCurrentColumn] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ col: string; idx: number } | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const assigneeRef = useRef<HTMLInputElement | null>(null);
  const priorityRef = useRef<HTMLSelectElement | null>(null);
  const commentsRef = useRef<HTMLTextAreaElement | null>(null);
  const dragged = useRef<{ col: string; idx: number } | null>(null);

  useEffect(() => {
    // Ensure all columns exist for current standalone board key
    setState((s) => {
      const copy = { ...s };
      let changed = false;
      COLUMNS.forEach((c) => {
        if (!copy[c]) { copy[c] = []; changed = true; }
      });
      if (changed) {
        try { localStorage.setItem('kanban', JSON.stringify(copy)); } catch {}
        return copy;
      }
      return s;
    });

    function onLoadGroup(e: any) {
      const group = e?.detail;
      if (!group || !group.name) return;
      setCurrentGroup(group.name);
      // load group-specific board
      try {
        const key = `kanban-board:${group.name}`;
        const data = JSON.parse(localStorage.getItem(key) || 'null');
        if (data) setState(data);
        else {
          // initialize default empty board for group
          const init: Record<string, Card[]> = {};
          COLUMNS.forEach(c => init[c] = []);
          setState(init);
          localStorage.setItem(key, JSON.stringify(init));
        }
      } catch {
        // ignore
      }
    }

    function onUser(e: any) {
      const u = e?.detail;
      setUserEmail(u?.email ?? null);
    }

    window.addEventListener('kanban:load-group', onLoadGroup as EventListener);
    window.addEventListener('kanban:user', onUser as EventListener);
    return () => {
      window.removeEventListener('kanban:load-group', onLoadGroup as EventListener);
      window.removeEventListener('kanban:user', onUser as EventListener);
    };
  }, []);

  function saveState(next: Record<string, Card[]>) {
    setState(next);
    try {
      if (currentGroup) {
        localStorage.setItem(`kanban-board:${currentGroup}`, JSON.stringify(next));
      } else {
        localStorage.setItem('kanban', JSON.stringify(next));
      }
    } catch {}
  }

  function onDragStart(col: string, idx: number) {
    dragged.current = { col, idx };
  }

  function onDrop(targetCol: string) {
    if (!dragged.current) return;
    const src = dragged.current;
    const next = { ...state };
    const item = next[src.col].splice(src.idx, 1)[0];
    next[targetCol].push(item);
    dragged.current = null;
    saveState(next);
  }

  function openModal(col: string, idx?: number) {
    setCurrentColumn(col);
    if (typeof idx === 'number') setEditing({ col, idx }); else setEditing(null);
    setShowModal(true);
    setTimeout(() => titleRef.current?.focus(), 10);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    if (titleRef.current) titleRef.current.value = '';
    if (assigneeRef.current) assigneeRef.current.value = '';
    if (priorityRef.current) priorityRef.current.value = 'low';
    if (commentsRef.current) commentsRef.current.value = '';
  }

  function saveCard() {
    const data: Card = {
      title: titleRef.current?.value || '',
      assignee: assigneeRef.current?.value || '',
      priority: priorityRef.current?.value || 'low',
      comments: commentsRef.current?.value || ''
    };
    const next = { ...state };
    if (editing) {
      next[editing.col][editing.idx] = data;
    } else if (currentColumn) {
      next[currentColumn] = [...(next[currentColumn] || []), data];
    }
    saveState(next);
    closeModal();
  }

  function deleteCard(col: string, idx: number) {
    const next = { ...state };
    next[col].splice(idx, 1);
    saveState(next);
  }

  return (
    <div className="text-slate-900 dark:text-slate-100 p-[10px] overflow-x-scroll ">

      <header className="px-4 py-3 text-lg font-semibold">
        {currentGroup ? `${currentGroup} — ${userEmail ?? 'anonymous'}` : 'BugHerd-Style Professional Kanban'}
      </header>

      <div className="overflow-x-auto px-4 pb-6">
        <div className="flex gap-4 min-w-max h-[calc(100vh-140px)]">
          {COLUMNS.map((col) => (
            <div key={col} className="w-80 bg-slate-100 dark:bg-slate-800 rounded-md p-3 flex flex-col border-2 border-gray-200 dark:border-gray-700">
                 
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{col}</h3>
                <button className="mt-2 text-sm text-indigo-600 hover:underline" onClick={() => openModal(col)}>+ Add</button>
                <span className="text-xs text-slate-500 dark:text-slate-400">{(state[col] || []).length}</span>
              </div>

              <div
                className="flex-1 overflow-y-auto p-1 rounded "
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(col)}
              >
                {(state[col] || []).map((c, i) => {
                  const priorityClass = c.priority === 'high' ? 'border-red-500' : c.priority === 'medium' ? 'border-amber-400' : 'border-emerald-400';
                  return (
                    <div
                      key={i}
                      className={`bg-white dark:bg-gray-900 rounded p-3 mb-2 cursor-grab border-l-4 ${priorityClass}`}
                      draggable
                      onDragStart={() => onDragStart(col, i)}
                    >
                      <div className="font-semibold text-sm mb-1">{c.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{c.assignee || 'Unassigned'}</div>
                      <div className="mt-2 flex gap-2">
                        <button className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-800" onClick={() => openModal(col, i)}>Edit</button>
                        <button className="text-sm px-2 py-1 rounded bg-red-600 text-white" onClick={() => deleteCard(col, i)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>

             
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 w-96 rounded p-4">
            <h3 className="text-lg font-semibold mb-2">Task</h3>
            <input ref={titleRef} placeholder="Title" defaultValue={editing ? state[editing.col][editing.idx].title : ''} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm" />
            <input ref={assigneeRef} placeholder="Assignee" defaultValue={editing ? state[editing.col][editing.idx].assignee : ''} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm" />
            <select ref={priorityRef} defaultValue={editing ? state[editing.col][editing.idx].priority : 'low'} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <textarea ref={commentsRef} placeholder="Comments / feedback" defaultValue={editing ? state[editing.col][editing.idx].comments : ''} className="w-full mb-3 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { closeModal(); }} className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800">Cancel</button>
              <button onClick={saveCard} className="px-3 py-1 rounded bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
