"use client";

import React, { useEffect, useRef, useState } from 'react';
import { getColumns, fetchBoard, upsertCard, upsertCards, deleteCard } from '../lib/supabaseClient';

const DEFAULT_COLUMNS = ["All Tasks", "In Progress", "Review","Deployment", "Done"];

type Card = {
  id?: string;
  title: string;
  assignee?: string; // email fallback for display
  assigneeId?: string | null;
  priority?: string;
  comments?: string;
  dueDate?: string;
  processLink?: string;
  bugherdLink?: string;
  position?: number; // mapped from order_index
  columnId?: string | null;
};

type Member = { id?: string; name: string; email: string };

function generateId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

export default function KanbanBoard(): React.ReactElement {
  const [state, setState] = useState<Record<string, Card[]>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('kanban') || 'null');
      if (!raw) return {};
      // support legacy shape (columns object) or new shape { columns, userOrder }
      if (raw.columns) return raw.columns || {};
      return raw || {};
    } catch {
      return {};
    }
  });
  const [userOrder, setUserOrder] = useState<Record<string, boolean>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('kanban') || 'null');
      if (!raw) return {};
      if (raw.userOrder) return raw.userOrder || {};
      return {};
    } catch {
      return {};
    }
  });
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentMembers, setCurrentMembers] = useState<Member[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentColumn, setCurrentColumn] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ col: string; idx: number } | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const assigneeRef = useRef<HTMLSelectElement | HTMLInputElement | null>(null);
  const priorityRef = useRef<HTMLSelectElement | null>(null);
  const commentsRef = useRef<HTMLTextAreaElement | null>(null);
  const dueDateRef = useRef<HTMLInputElement | null>(null);
  const processLinkRef = useRef<HTMLInputElement | null>(null);
  const bugherdRef = useRef<HTMLInputElement | null>(null);
  const dragged = useRef<{ col: string; idx: number } | null>(null);

  // keep a mapping between column id and title to map server cards into UI buckets
  const colIdToTitle = useRef<Record<string,string>>({});

  useEffect(() => {
    async function loadFromServer() {
      try {
        const board = await fetchBoard();
        const cols = board.columns || [];
        const cards = board.cards || [];
        // populate column mappings
        const titles = cols.map((c:any) => c.title);
        const idToTitle: Record<string,string> = {};
        cols.forEach((c:any) => { idToTitle[c.id] = c.title; });
        colIdToTitle.current = idToTitle;
        setColumns(titles.length ? titles : DEFAULT_COLUMNS);

        // build state mapping title -> card[]
        const nextState: Record<string, Card[]> = {};
        const allTitles = (titles.length ? titles : DEFAULT_COLUMNS);
        allTitles.forEach(t => nextState[t] = []);
        cards.forEach((r:any) => {
          const colTitle = idToTitle[r.column_id] || allTitles[0];
          const uiCard: any = {
            id: r.id,
            title: r.title,
            comments: r.description || '',
            assignee: r.assignee_email || '',
            assigneeId: (r as any).assignee_id || null,
            priority: (r as any).priority || 'low',
            dueDate: (r as any).due_date || '',
            processLink: (r as any).process_link || '',
            bugherdLink: (r as any).bugherd_link || '',
            position: (r as any).order_index ?? 0,
            columnId: r.column_id
          };
          if (!nextState[colTitle]) nextState[colTitle] = [];
          nextState[colTitle].push(uiCard);
        });
        setState(nextState);
        setUserOrder({});
      } catch (err) {
        // keep previous client state if server fetch fails
        console.error('fetchBoard failed', err);
      }
    }

    function onLoadGroup(e: any) {
      const group = e?.detail;
      if (!group || !group.name) return;
      setCurrentGroup(group.name);
      setCurrentMembers(group.members || []);
      loadFromServer();
    }

    function onUser(e: any) {
      const u = e?.detail;
      setUserEmail(u?.email ?? null);
    }

    window.addEventListener('kanban:load-group', onLoadGroup as EventListener);
    window.addEventListener('kanban:user', onUser as EventListener);
    // initial load
    (async () => {
      try { const cols = await getColumns(); if (cols && cols.length) setColumns(cols.map(c=>c.title)); } catch {}
    })();

    return () => {
      window.removeEventListener('kanban:load-group', onLoadGroup as EventListener);
      window.removeEventListener('kanban:user', onUser as EventListener);
    };
  }, []);

  function saveState(next: Record<string, Card[]>) {
    setState(next);
    try {
      if (currentGroup) {
        localStorage.setItem(`kanban-board:${currentGroup}`, JSON.stringify({ columns: next, userOrder }));
      } else {
        localStorage.setItem('kanban', JSON.stringify({ columns: next, userOrder }));
      }
    } catch {}
  }

  function onDragStart(col: string, idx: number) {
    dragged.current = { col, idx };
  }

  async function onDrop(targetCol: string) {
    if (!dragged.current) return;
    const src = dragged.current;
    const next = { ...state };
    const item = next[src.col].splice(src.idx, 1)[0];
    next[targetCol].push(item);
    dragged.current = null;
    // mark both columns as user-ordered when a drag occurs
    setUserOrder((u) => ({ ...u, [src.col]: true, [targetCol]: true }));
    saveState(next);
    await persistOrder(next);
  }

  async function onDropAt(targetCol: string, targetIdx: number) {
    if (!dragged.current) return;
    const src = dragged.current;
    const next = { ...state };
    const item = next[src.col].splice(src.idx, 1)[0];
    // if moving within same column and the source index is before target index, adjust insertion idx
    let insertIdx = targetIdx;
    if (src.col === targetCol && src.idx < targetIdx) insertIdx = targetIdx - 1;
    next[targetCol].splice(insertIdx, 0, item);
    dragged.current = null;
    setUserOrder((u) => ({ ...u, [src.col]: true, [targetCol]: true }));
    saveState(next);
    await persistOrder(next);
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
    if (dueDateRef.current) dueDateRef.current.value = '';
    if (processLinkRef.current) processLinkRef.current.value = '';
    if (bugherdRef.current) bugherdRef.current.value = '';
  }

  async function saveCard() {
    const data: any = {
      title: titleRef.current?.value || '',
      assignee: (assigneeRef.current as HTMLInputElement | HTMLSelectElement | null)?.value || '',
      priority: priorityRef.current?.value || 'low',
      comments: commentsRef.current?.value || ''
    };
    // include additional fields
    data.dueDate = dueDateRef.current?.value || '';
    data.processLink = processLinkRef.current?.value || '';
    data.bugherdLink = bugherdRef.current?.value || '';

    const next = { ...state };
    // determine DB column id for the current column title
    const getColumnId = (title: string) => {
      const map = colIdToTitle.current;
      const entry = Object.entries(map).find(([id, t]) => t === title);
      return entry ? entry[0] : undefined;
    };

    try {
      if (editing) {
        // update existing
        const existing = next[editing.col][editing.idx] as any;
        // resolve assignee id if available from currentMembers
        const assigneeId = currentMembers.find(m => m.email === data.assignee)?.id || existing?.assigneeId || null;
        const assigneeEmail = data.assignee || existing?.assignee || '';
        const row: any = {
          id: existing?.id,
          title: data.title,
          description: data.comments || '',
          column_id: getColumnId(editing.col) || existing?.columnId || null,
          order_index: existing?.position ?? editing.idx,
          priority: data.priority || 'low',
          assignee_id: assigneeId,
          assignee_email: assigneeEmail,
          due_date: data.dueDate || '',
          process_link: data.processLink || '',
          bugherd_link: data.bugherdLink || ''
        };
        await upsertCard(row);
      } else if (currentColumn) {
        const colId = getColumnId(currentColumn) || null;
        const pos = (next[currentColumn] || []).length;
        const assigneeId = currentMembers.find(m => m.email === data.assignee)?.id || null;
        const row: any = {
          id: generateId(),
          title: data.title,
          description: data.comments || '',
          column_id: colId,
          order_index: pos,
          priority: data.priority || 'low',
          assignee_id: assigneeId,
          assignee_email: data.assignee || '',
          due_date: data.dueDate || '',
          process_link: data.processLink || '',
          bugherd_link: data.bugherdLink || ''
        };
        await upsertCard(row);
      }
      // refresh from server
      const board = await fetchBoard();
      // rebuild UI state similar to initial load
      const cols = board.columns || [];
      const cards = board.cards || [];
      const titles = cols.map((c:any) => c.title);
      const idToTitle: Record<string,string> = {};
      cols.forEach((c:any) => { idToTitle[c.id] = c.title; });
      colIdToTitle.current = idToTitle;
      const nextState: Record<string, Card[]> = {};
      const allTitles = (titles.length ? titles : DEFAULT_COLUMNS);
      allTitles.forEach(t => nextState[t] = []);
      cards.forEach((r:any) => {
        const colTitle = idToTitle[r.column_id] || allTitles[0];
        const uiCard: any = {
          id: r.id,
          title: r.title,
          comments: r.description || '',
          assignee: r.assignee_email || '',
          assigneeId: (r as any).assignee_id || null,
          priority: (r as any).priority || 'low',
          dueDate: (r as any).due_date || '',
          processLink: (r as any).process_link || '',
          bugherdLink: (r as any).bugherd_link || '',
          position: (r as any).order_index ?? 0,
          columnId: r.column_id
        };
        if (!nextState[colTitle]) nextState[colTitle] = [];
        nextState[colTitle].push(uiCard);
      });
      setState(nextState);
      setUserOrder({});
    } catch (err) {
      console.error('saveCard failed', err);
    }

    closeModal();
  }

  async function removeCardLocal(col: string, idx: number) {
    const next = { ...state };
    const item: any = next[col][idx];
    if (item && item.id) {
      try {
        await deleteCard(item.id);
      } catch (err) {
        console.error('deleteCard failed', err);
      }
    }
    next[col].splice(idx, 1);
    saveState(next);
    // refresh server state
    try {
      const board = await fetchBoard();
      const cols = board.columns || [];
      const cards = board.cards || [];
      const titles = cols.map((c:any) => c.title);
      const idToTitle: Record<string,string> = {};
      cols.forEach((c:any) => { idToTitle[c.id] = c.title; });
      colIdToTitle.current = idToTitle;
      const nextState: Record<string, Card[]> = {};
      const allTitles = (titles.length ? titles : DEFAULT_COLUMNS);
      allTitles.forEach(t => nextState[t] = []);
      cards.forEach((r:any) => {
        const colTitle = idToTitle[r.column_id] || allTitles[0];
        const uiCard: any = {
          id: r.id,
          title: r.title,
          comments: r.description || '',
          assignee: r.assignee_email || '',
          assigneeId: (r as any).assignee_id || null,
          priority: (r as any).priority || 'low',
          dueDate: (r as any).due_date || '',
          processLink: (r as any).process_link || '',
          bugherdLink: (r as any).bugherd_link || '',
          position: (r as any).order_index ?? 0,
          columnId: r.column_id
        };
        if (!nextState[colTitle]) nextState[colTitle] = [];
        nextState[colTitle].push(uiCard);
      });
      setState(nextState);
    } catch (err) {
      // ignore
    }
  }

  async function persistOrder(nextState: Record<string, Card[]>) {
    try {
      const rows: any[] = [];
      Object.keys(nextState).forEach((title) => {
        const colIdEntry = Object.entries(colIdToTitle.current).find(([id, t]) => t === title);
        const colId = colIdEntry ? colIdEntry[0] : null;
        nextState[title].forEach((c:any, idx:number) => {
            const memberId = currentMembers.find(m => m.email === c.assignee)?.id || (c.assigneeId || null);
            rows.push({ id: c.id || generateId(), title: c.title, description: c.comments || '', column_id: colId, order_index: idx, priority: c.priority || 'low', assignee_id: memberId, assignee_email: c.assignee || '', due_date: c.dueDate || '', process_link: c.processLink || '', bugherd_link: c.bugherdLink || '' });
          });
      });
      if (rows.length) await upsertCards(rows as any);
    } catch (err) {
      console.error('persistOrder failed', err);
    }
  }

  function confirmDelete(col: string, idx: number) {
    try {
      const answer = window.prompt("Type 'delete' to confirm deleting this task:");
      if (!answer) return;
      if (answer.toLowerCase() !== 'delete') return;
      removeCardLocal(col, idx);
    } catch {
      // ignore
    }
  }

  return (
    <div className="text-slate-900 dark:text-slate-100 p-[10px] overflow-x-scroll ">

      <header className="px-4 py-3 text-lg font-semibold">
        {currentGroup ? `${currentGroup}` : 'BugHerd-Style Professional Kanban'}
      </header>

      <div className="overflow-x-auto px-4 pb-6">
        <div className="flex gap-4 min-w-max h-[calc(100vh-140px)]">
          {columns.map((col) => (
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

                {(function(){
                  const list = state[col] || [];
                  // entries with original index
                  const entries = list.map((card, idx) => ({ card, idx }));
                  if (!userOrder[col]) {
                    const today = new Date();
                    const priorityRank = (p?: string) => p === 'high' ? 3 : p === 'medium' ? 2 : 1;
                    entries.sort((ea, eb) => {
                      const a = ea.card, b = eb.card;
                      const pa = priorityRank(a.priority), pb = priorityRank(b.priority);
                      if (pa !== pb) return pb - pa; // higher priority first
                      const aDue = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
                      const bDue = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
                      const aOver = a.dueDate ? (new Date(a.dueDate) < today ? 0 : 1) : 1;
                      const bOver = b.dueDate ? (new Date(b.dueDate) < today ? 0 : 1) : 1;
                      if (aOver !== bOver) return aOver - bOver; // overdue (0) first
                      return aDue.getTime() - bDue.getTime();
                    });
                  }
                  return entries.map(({card, idx}) => ({ c: card, originalIdx: idx }));
                })().map(({c, originalIdx}) => {
                  const priorityClass = c.priority === 'high' ? 'border-red-500' : c.priority === 'medium' ? 'border-amber-400' : 'border-emerald-400';
                  return (
                    <div
                      key={originalIdx}
                      className={`bg-white dark:bg-gray-900 rounded p-4  mb-2 cursor-grab border-l-4 ${priorityClass}`}
                      draggable
                      onDragStart={() => onDragStart(col, originalIdx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDropAt(col, originalIdx)}
                    >
                      <div className="font-semibold text-sm mb-1">{c.title}</div>
                      {c.comments && <div className="text-xs text-gray-500 dark:text--400 my-3">{c.comments}</div>}
                      <div className="text-xs text-blue-500 dark:text-slate-400 mb-2">{(currentMembers.find(m=>m.email===c.assignee)?.name) || c.assignee || 'Unassigned'}</div>
                      {c.dueDate ? <div className="text-xs text-amber-600 dark:text-amber-400">Due: {c.dueDate}</div> : null}
                      {c.processLink ? <div className="text-xs"><a className="text-indigo-600 dark:text-indigo-400 underline" href={c.processLink} target="_blank" rel="noreferrer">Process Link</a></div> : null}
                      {c.bugherdLink ? <div className="text-xs"><a className="text-indigo-600 dark:text-indigo-400 underline" href={c.bugherdLink} target="_blank" rel="noreferrer">BugHerd</a></div> : null}
                     
                      <div className="mt-2 flex gap-2 mt-6">
                        <button className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-800" onClick={() => openModal(col, originalIdx)}>Edit</button>
                        <button className="text-sm px-2 py-1 rounded bg-red-600 text-white" onClick={() => confirmDelete(col, originalIdx)}>Delete</button>
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
            {currentMembers.length ? (
              <select ref={assigneeRef as any} defaultValue={editing ? state[editing.col][editing.idx].assignee : ''} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm">
                <option value="">Unassigned</option>
                {currentMembers.map((m) => (
                  <option key={m.email} value={m.email}>{m.name} — {m.email}</option>
                ))}
              </select>
            ) : (
              <input ref={assigneeRef as any} placeholder="Assignee" defaultValue={editing ? state[editing.col][editing.idx].assignee : ''} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm" />
            )}
            <input ref={dueDateRef} type="date" defaultValue={editing ? state[editing.col][editing.idx].dueDate || '' : ''} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm" />
            <input ref={processLinkRef} placeholder="Process link (https://...)" defaultValue={editing ? state[editing.col][editing.idx].processLink || '' : ''} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm" />
            <input ref={bugherdRef} placeholder="BugHerd link (https://...)" defaultValue={editing ? state[editing.col][editing.idx].bugherdLink || '' : ''} className="w-full mb-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 text-sm" />
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
