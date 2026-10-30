-- Money Matter v2: one private, versioned document per user.
--
-- The app is local-first: it works from a device cache and syncs the whole
-- document. `revision` makes concurrent edits from two devices detectable
-- instead of silently overwriting each other.
--
-- Run with `supabase db push`, or paste into the SQL editor.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  revision   integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint user_data_max_size  check (pg_column_size(data) < 8 * 1024 * 1024)
);

alter table public.user_data enable row level security;

-- Each user can only ever touch their own row.
create policy "Users read their own data"
  on public.user_data for select to authenticated
  using (auth.uid() = user_id);

create policy "Users create their own data"
  on public.user_data for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update their own data"
  on public.user_data for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own data"
  on public.user_data for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_data to authenticated;
revoke all on public.user_data from anon;

-- The server, not the client, owns revision numbers and timestamps.
create or replace function public.user_data_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.revision   := 1;
    new.created_at := now();
    new.updated_at := now();
  else
    new.user_id    := old.user_id;
    new.created_at := old.created_at;
    new.revision   := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists user_data_before_write on public.user_data;
create trigger user_data_before_write
  before insert or update on public.user_data
  for each row execute function public.user_data_before_write();

-- Self-service "delete my account and all my data" (privacy requirement).
-- Removing the auth user cascades to user_data.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
