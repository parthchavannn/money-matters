-- Create investments table
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  type text not null,
  invested numeric not null,
  current_value numeric,
  invested_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.investments enable row level security;

-- Policies
create policy if not exists "Users can view their own investments"
  on public.investments for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own investments"
  on public.investments for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own investments"
  on public.investments for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own investments"
  on public.investments for delete
  using (auth.uid() = user_id);

-- Updated at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger if not exists update_investments_updated_at
before update on public.investments
for each row execute function public.update_updated_at_column();