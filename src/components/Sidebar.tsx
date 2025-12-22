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

  type Member = { name: string; email: string };
  type Group = { id: string; name: string; members: Member[] };

  const [groups, setGroups] = useState<Group[]>(() => {
    try { return JSON.parse(localStorage.getItem('kanban-groups') || 'null') || [
      { id: 'web-builds', name: 'Web Builds Tracker', members: [{ name: 'Clinton Taypoc', email: 'clinton.taypoc@mrisoftware.com' }] },
      { id: 'ps-media', name: 'PS Media Tracker', members: [] }
    ]; } catch { return []; }
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => { return groups[0]?.id ?? null; });
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberEmail, setEditMemberEmail] = useState('');

  // ensure a selected group exists when groups change
  useEffect(() => {
    if (!selectedGroupId && groups.length) {
      setSelectedGroupId(groups[0].id);
      const g = groups[0];
      window.dispatchEvent(new CustomEvent('kanban:load-group', { detail: g }));
    }
  }, [groups, selectedGroupId]);

  async function load() {
    const res = await fetchBoard();
    setColumns(res.columns);
    setCards(res.cards);
  }

  useEffect(() => {
    load();
    function onRefresh() { load(); }
    window.addEventListener('kanban:refresh', onRefresh as EventListener);
    function onUser(_e: any) { /* noop - keep sidebar intact */ }
    window.addEventListener('kanban:user', onUser as EventListener);
    // initialize selected group load
    if (selectedGroupId) {
      const g = groups.find(x => x.id === selectedGroupId);
      if (g) window.dispatchEvent(new CustomEvent('kanban:load-group', { detail: g }));
    }

    return () => {
      window.removeEventListener('kanban:refresh', onRefresh as EventListener);
      window.removeEventListener('kanban:user', onUser as EventListener);
    };
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

  function persistGroups(next: Group[]) {
    setGroups(next);
    try { localStorage.setItem('kanban-groups', JSON.stringify(next)); } catch {}
  }

  function selectGroup(id: string) {
    setSelectedGroupId(id);
    const g = groups.find(x => x.id === id);
    window.dispatchEvent(new CustomEvent('kanban:load-group', { detail: g }));
  }

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const next = [...groups, { id, name, members: [] }];
    persistGroups(next);
    setNewGroupName('');
    selectGroup(id);
  }

  function addMember() {
    if (!selectedGroupId) return;
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;
    const next = groups.map(g => g.id === selectedGroupId ? { ...g, members: [...g.members, { name: newMemberName.trim(), email: newMemberEmail.trim() }] } : g);
    persistGroups(next);
    setNewMemberName(''); setNewMemberEmail('');
  }

  return (
    <aside className=" p-4 pb-[100px] mt-[80px]  w-[300px] bg-white dark:bg-gray-800 border-r-2 border-gray-200 dark:border-gray-700 absolute left-0 top-0 bottom-0">
        {/* <div className='my-[50px]'>
          <h1 className="text-2xl font-bold">SE Tasks Tracker</h1>
        </div> */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Groups</h3>
       
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {(groups || []).map(g => (
            <button key={g.id} onClick={() => selectGroup(g.id)} className={`w-full text-left px-2 py-2 rounded ${selectedGroupId===g.id? 'bg-white dark:bg-slate-700 shadow-sm':'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                  {g.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{g.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{g.members.length} member{g.members.length!==1?'s':''}</div>
                </div>
                <div className="text-xs text-slate-400">›</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Members</h3>
          <button
            aria-label="Add member"
            title="Add member"
            onClick={() => setShowAddMember(v => !v)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 relative">
          <div className="flex flex-wrap gap-2">
            {(groups.find(g=>g.id===selectedGroupId)?.members || []).map((m,idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm w-full relative">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                  {m.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  {editingMemberIndex === idx ? (
                    <div className="space-y-1">
                      <input value={editMemberName} onChange={(e)=>setEditMemberName(e.target.value)} className="w-full p-1 rounded border text-sm bg-white dark:bg-gray-800" />
                      <input value={editMemberEmail} onChange={(e)=>setEditMemberEmail(e.target.value)} className="w-full p-1 rounded border text-sm bg-white dark:bg-gray-800" />
                      <div className="flex gap-2 justify-end mt-1">
                        <button onClick={() => { setEditingMemberIndex(null); }} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-sm">Cancel</button>
                        <button onClick={() => {
                          if (!selectedGroupId) return;
                          const next = groups.map(g => {
                            if (g.id !== selectedGroupId) return g;
                            const members = g.members.map((mm, i) => i === idx ? { name: editMemberName.trim() || mm.name, email: editMemberEmail.trim() || mm.email } : mm);
                            return { ...g, members };
                          });
                          persistGroups(next);
                          setEditingMemberIndex(null);
                        }} className="px-2 py-1 rounded bg-indigo-600 text-white text-sm">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between relative">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{m.email}</div>
                      </div>
                      <div className="flex items-center  absolute right-0 top-0">
                        <button onClick={() => {
                          setEditingMemberIndex(idx);
                          setEditMemberName(m.name);
                          setEditMemberEmail(m.email);
                        }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Edit member">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 dark:text-slate-300" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/></svg>
                        </button>
                        <button onClick={() => {
                          if (!confirm(`Remove member ${m.name}?`)) return;
                          if (!selectedGroupId) return;
                          const next = groups.map(g => g.id === selectedGroupId ? { ...g, members: g.members.filter((_,i)=>i!==idx) } : g);
                          persistGroups(next);
                        }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Remove member">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1H4v9a2 2 0 002 2h8a2 2 0 002-2V5h.5a.5.5 0 000-1H15V3a1 1 0 00-1-1H6zm2 5a.5.5 0 011 0v7a.5.5 0 01-1 0V7zm4 0a.5.5 0 011 0v7a.5.5 0 01-1 0V7z" clipRule="evenodd"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showAddMember && (
            <div className="mt-2 bg-white dark:bg-gray-800 p-2 rounded border border-slate-100 dark:border-slate-700 absolute shadow-lg w-full z-10 p-4 -top-2">
              <input value={newMemberName} onChange={(e)=>setNewMemberName(e.target.value)} placeholder="Member name" className="w-full p-2 mb-2 border rounded bg-white dark:bg-gray-800 text-sm" />
              <input value={newMemberEmail} onChange={(e)=>setNewMemberEmail(e.target.value)} placeholder="Member email" className="w-full p-2 mb-2 border rounded bg-white dark:bg-gray-800 text-sm" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddMember(false)} className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700">Cancel</button>
                <button onClick={() => { addMember(); setShowAddMember(false); }} className="px-3 py-1 rounded bg-indigo-600 text-white">Add</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* <div className="space-y-4 overflow-y-auto max-h-[30vh]">
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
      </div> */}
    </aside>
  );
}
