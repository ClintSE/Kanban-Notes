import { createClient } from '@supabase/supabase-js';

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
type CardRow = { id: string; title: string; description?: string; column_id: string; position: number };

export async function getSetting(key: string): Promise<string | null> {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  let query = supabase.from('settings').select('value').eq('key', key);
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query.single();
  if (error) return null;
  return data?.value ?? null;
}

export async function upsertSetting(key: string, value: string) {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  const payload: any = { key, value };
  if (user) payload.user_id = user.id;
  return supabase.from('settings').upsert(payload);
}

export async function getColumns(): Promise<ColumnType[]> {
  const { data, error } = await supabase.from('columns').select('*').order('position', { ascending: true });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({ id: r.id, title: r.title, position: r.position }));
}

export async function getCards(): Promise<CardType[]> {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  let query = supabase.from('cards').select('*').order('position', { ascending: true });
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as any[]).map((r) => ({ id: r.id, title: r.title, description: r.description ?? '', columnId: r.column_id, position: r.position }));
}

export async function upsertCards(cards: CardType[]) {
  // Map to DB shape
  const rows = cards.map((c) => ({ id: c.id, title: c.title, description: c.description ?? '', column_id: c.columnId, position: c.position }));
  return supabase.from('cards').upsert(rows as any[]);
}

export async function upsertCard(card: CardType) {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  const row: any = { id: card.id, title: card.title, description: card.description ?? '', column_id: card.columnId, position: card.position };
  if (user) row.user_id = user.id;
  return supabase.from('cards').upsert(row as any).select();
}

export async function deleteCard(id: string) {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  let query = supabase.from('cards').delete().eq('id', id);
  if (user) query = query.eq('user_id', user.id);
  return query;
}

// Auth helpers
export async function getUser() {
  const res = await supabase.auth.getUser();
  return res?.data?.user ?? null;
}

export function onAuthStateChange(cb: (event: string, session: any) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return data.subscription;
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
}

export function signOut() {
  return supabase.auth.signOut();
}

export async function fetchBoard() {
  const [cols, cds] = await Promise.all([getColumns(), getCards()]);
  return { columns: cols, cards: cds };
}
