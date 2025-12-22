import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // In production you'd want a more robust error handling strategy
  console.warn('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default supabase;

// Helper types matching the DB schema (columns: id, title, position; cards: id, title, description, column_id, position)
import type { Column as ColumnType, Card as CardType } from '../types';

type ColumnRow = { id: string; title: string; position: number };
type CardRow = { id: string; title: string; description?: string; column_id: string | null; order_index?: number; priority?: string; assignee_id?: string | null; assignee_email?: string; due_date?: string; process_link?: string; bugherd_link?: string; created_by?: string | null; created_at?: string; updated_at?: string };

// TaskRow exposes the canonical tasks table shape
export type TaskRow = {
  id: string;
  group_id: string | null;
  column_id: string | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  assignee_id?: string | null;
  assignee_email?: string | null;
  due_date?: string | null;
  process_link?: string | null;
  bugherd_link?: string | null;
  order_index?: number | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function getSetting(key: string): Promise<string | null> {
  const userRes = await supabase.auth.getUser();
  const user: User | null = userRes?.data?.user ?? null;
  let query = supabase.from('settings').select('value').eq('key', key);
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query.single();
  if (error) return null;
  // data is a row like { value: string }
  return (data as { value?: string } | null)?.value ?? null;
}

export async function upsertSetting(key: string, value: string) {
  const userRes = await supabase.auth.getUser();
  const user: User | null = userRes?.data?.user ?? null;
  const payload: { key: string; value: string; user_id?: string } = { key, value };
  if (user) payload.user_id = user.id;
  return supabase.from('settings').upsert(payload);
}

export async function getColumns(): Promise<ColumnType[]> {
  // Prefer canonical `kanban_columns` table; fallback to legacy `columns` if missing
  try {
    const { data, error } = await supabase.from('kanban_columns').select('*').order('position', { ascending: true });
    if (!error && data) return (data as ColumnRow[]).map((r) => ({ id: r.id, title: r.title, position: r.position }));
  } catch (err) {
    // ignore and try legacy table
  }
  // fallback
  const { data, error } = await supabase.from('columns').select('*').order('position', { ascending: true });
  if (error || !data) return [];
  return (data as ColumnRow[]).map((r) => ({ id: r.id, title: r.title, position: r.position }));
}

export async function getCards(): Promise<CardType[]> {
  const userRes = await supabase.auth.getUser();
  const user: User | null = userRes?.data?.user ?? null;
  // use the `tasks` table as the canonical source for cards/tasks
  let query = supabase.from('tasks').select('*').order('position', { ascending: true });
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as CardRow[]).map((r) => ({ id: r.id, title: r.title, description: r.description ?? '', columnId: r.column_id ?? '', position: (r as any).order_index ?? 0, priority: (r as any).priority, assignee_id: (r as any).assignee_id, assignee_email: (r as any).assignee_email, due_date: (r as any).due_date, process_link: (r as any).process_link, bugherd_link: (r as any).bugherd_link, created_by: (r as any).created_by, created_at: (r as any).created_at, updated_at: (r as any).updated_at }));
}

export async function getTasks(groupId?: string) {
  const userRes = await supabase.auth.getUser();
  const user: User | null = userRes?.data?.user ?? null;
  let query = supabase.from('tasks').select('*').order('order_index', { ascending: true });
  if (groupId) query = query.eq('group_id', groupId);
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as TaskRow[];
}

export async function upsertCards(cards: CardType[]) {
  // Map to DB shape
  const userRes = await supabase.auth.getUser();
  const user: User | null = userRes?.data?.user ?? null;
  const rows = cards.map((c) => {
    const base: any = { id: c.id, title: c.title, description: c.description ?? '', column_id: c.columnId || null, order_index: c.position ?? 0 };
    if ((c as any).priority) base.priority = (c as any).priority;
    // support both assignee_id and assignee/assignee_email fallbacks
    if ((c as any).assignee_id) base.assignee_id = (c as any).assignee_id;
    if ((c as any).assignee_email) base.assignee_email = (c as any).assignee_email;
    if ((c as any).assignee) base.assignee_email = (c as any).assignee;
    if ((c as any).due_date) base.due_date = (c as any).due_date;
    if ((c as any).dueDate) base.due_date = (c as any).dueDate;
    if ((c as any).process_link) base.process_link = (c as any).process_link;
    if ((c as any).processLink) base.process_link = (c as any).processLink;
    if ((c as any).bugherd_link) base.bugherd_link = (c as any).bugherd_link;
    if ((c as any).bugherdLink) base.bugherd_link = (c as any).bugherdLink;
    if ((c as any).created_by) base.created_by = (c as any).created_by;
    if (user) base.user_id = user.id;
    return base;
  });
  // write into `tasks` table (canonical tasks storage)
  return supabase.from('tasks').upsert(rows);
}

export async function upsertCard(card: any) {
  const userRes = await supabase.auth.getUser();
  const user: User | null = userRes?.data?.user ?? null;
  const row: any = {
    id: card.id,
    title: card.title,
    description: card.description ?? '',
    column_id: card.columnId || null,
    order_index: card.position ?? 0,
    priority: card.priority || null,
    assignee_id: (card as any).assigneeId || null,
    assignee_email: card.assignee || card.assignee_email || null,
    due_date: card.dueDate || card.due_date || null,
    process_link: card.processLink || card.process_link || null,
    bugherd_link: card.bugherdLink || card.bugherd_link || null
  };
  if (user) row.user_id = user.id;
  return supabase.from('tasks').upsert(row).select();
}

export async function deleteCard(cardId: string) {
  const userRes = await supabase.auth.getUser();
  const user: User | null = userRes?.data?.user ?? null;
  let query = supabase.from('tasks').delete().eq('id', cardId);
  if (user) query = query.eq('user_id', user.id);
  return query;
}

// Members and groups mutators
export async function upsertMember(member: { id?: string; name: string; email: string }) {
  const row = { id: member.id, name: member.name, email: member.email };
  const { data, error } = await supabase.from('members').upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMember(memberId: string) {
  return supabase.from('members').delete().eq('id', memberId);
}

export async function addMemberToGroup(groupId: string, member: { name: string; email: string }) {
  // upsert member
  const m = await upsertMember({ name: member.name, email: member.email });
  // add relation
  await supabase.from('group_members').upsert({ group_id: groupId, member_id: m.id });
  return m;
}

export async function removeMemberFromGroup(groupId: string, memberId: string) {
  return supabase.from('group_members').delete().match({ group_id: groupId, member_id: memberId });
}

export async function createGroup(payload: { name: string; description?: string }) {
  const { data, error } = await supabase.from('groups').insert({ name: payload.name, description: payload.description || '' }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGroup(groupId: string) {
  return supabase.from('groups').delete().eq('id', groupId);
}


// Auth helpers
export async function getUser() {
  const res = await supabase.auth.getUser();
  return res?.data?.user ?? null;
}

export function onAuthStateChange(cb: (event: string, session: unknown) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return data.subscription;
}

export function signInWithGoogle() {
  // Let Supabase handle the OAuth redirect callback. If you need a
  // post-auth redirect, add your app URL to the Redirect URLs in
  // the Supabase Authentication settings and then pass redirectTo from
  // the client to match that value.
  return supabase.auth.signInWithOAuth({ provider: 'google' });
}

export function signOut() {
  return supabase.auth.signOut();
}

export async function fetchBoard(groupId?: string) {
  const [cols, tasks] = await Promise.all([getColumns(), getTasks(groupId)]);
  return { columns: cols, cards: tasks };
}

// Groups and members
export async function getGroups() {
  const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function getMembers() {
  const { data, error } = await supabase.from('members').select('*').order('name', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function getMembersForGroup(groupId: string) {
  // fetch group_members then fetch member rows
  const { data: gm, error: gmErr } = await supabase.from('group_members').select('member_id').eq('group_id', groupId);
  if (gmErr || !gm) return [];
  const ids = gm.map((r: any) => r.member_id);
  if (!ids.length) return [];
  const { data: members, error: mErr } = await supabase.from('members').select('*').in('id', ids);
  if (mErr || !members) return [];
  return members;
}
