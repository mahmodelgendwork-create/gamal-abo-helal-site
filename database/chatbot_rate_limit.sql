-- =====================================================================
-- Chatbot: rate-limit counters (protects the free Gemini quota from abuse).
-- Run ONCE in Supabase -> SQL Editor. Safe to run again.
--
-- Nobody on the website can read or write this table: Row Level Security is on with NO
-- policies, and the function below can only be called by the chatbot Edge Function
-- (service role). Your products / prices / admin tables are not touched.
-- =====================================================================
create table if not exists public.chat_rate_limits (
  bucket     text primary key,
  hits       int not null default 0,
  expires_at timestamptz not null
);
create index if not exists chat_rate_limits_expires_idx on public.chat_rate_limits (expires_at);
alter table public.chat_rate_limits enable row level security;   -- no policies => fully private

create or replace function public.chat_rate_hit(p_bucket text, p_limit int, p_ttl_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- tidy up old counters now and then
  if random() < 0.02 then delete from chat_rate_limits where expires_at < now(); end if;

  insert into chat_rate_limits (bucket, hits, expires_at)
  values (p_bucket, 1, now() + make_interval(secs => p_ttl_seconds))
  on conflict (bucket) do update set hits = chat_rate_limits.hits + 1
  returning hits into n;

  return n <= p_limit;      -- true = allowed, false = over the limit
end $$;

revoke all on function public.chat_rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.chat_rate_hit(text, int, int) to service_role;
