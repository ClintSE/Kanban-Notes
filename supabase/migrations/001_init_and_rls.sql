-- Create tables with optional user scoping and example RLS policies

-- Settings table (user-scoped)
create table if not exists public.settings (
  key text not null,
  value text,
  user_id uuid,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

-- Columns table (global by default)
create table if not exists public.columns (
  id text primary key,
  title text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

-- Cards table (user-scoped)
create table if not exists public.cards (
  id text primary key,
  title text not null,
  description text,
  column_id text not null references public.columns(id) on delete cascade,
  position int not null default 0,
  user_id uuid,
  created_at timestamptz default now()
);

create index if not exists idx_cards_column_position on public.cards (column_id, position);

-- Enable RLS and example policies (do this via Supabase SQL editor if you want to enable RLS)
-- ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "settings_user_access" ON public.settings
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "cards_user_access" ON public.cards
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- If you want public access to read columns, keep columns without RLS. For per-user columns add user_id column similarly.
