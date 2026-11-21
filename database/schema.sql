-- =====================================================================
-- Gamal Abo Hel'al — FULL DATABASE SCHEMA (fresh Supabase project)
-- Run this whole file ONCE: Supabase -> SQL Editor -> New query -> Run. Safe to run again.
-- Then run database/create_admin.sql (your admin account) and database/chatbot_rate_limit.sql.
-- (Already have the old database? Don't use this file — run database/upgrade_v2.sql instead.)
-- Price rule: price = (gms x gram price) + (gms x making charge); the making charge is editable in the admin page.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1) Categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          serial primary key,
  slug        text unique not null,
  name_ar     text not null,
  name_en     text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true
);

insert into public.categories (slug, name_ar, name_en, sort_order) values
  ('ring',         'خواتم',               'Rings',            10),
  ('wedding-band', 'دبل وخواتم زواج',     'Wedding Bands',    20),
  ('necklace',     'سلاسل',               'Chains & Necklaces',30),
  ('pendant',      'دلايات',              'Pendants',         40),
  ('bracelet',     'أساور',               'Bracelets',        50),
  ('bangle',       'غوايش',               'Bangles',          60),
  ('earring',      'حلقان',               'Earrings',         70),
  ('anklet',       'خلاخيل',              'Anklets',          80),
  ('set',          'أطقم',                'Jewelry Sets',     90),
  ('kids',         'مجوهرات أطفال',       'Kids Jewelry',    100),
  ('coin-bar',     'جنيهات وسبائك',       'Gold Coins & Bars',110),
  ('box',          'أطقم هدايا',          'Gift Sets',       120)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 2) Gold price per gram, per karat (EGP). Updated automatically.
-- ---------------------------------------------------------------------
create table if not exists public.gold_prices (
  karat          int primary key check (karat in (18, 21, 24, 800, 925, 999)),
  price_per_gram numeric(12,2) not null default 0,
  source         text,
  updated_at     timestamptz not null default now()
);

insert into public.gold_prices (karat, price_per_gram, source) values
  (24, 0, 'initial'), (21, 0, 'initial'), (18, 0, 'initial'),
  (999, 0, 'initial'), (925, 0, 'initial'), (800, 0, 'initial')
on conflict (karat) do nothing;

-- single-row settings: auto_update=false freezes the automatic updater
-- (use it when you type a price manually and don't want it overwritten)
create table if not exists public.gold_settings (
  id          int primary key default 1 check (id = 1),
  auto_update boolean not null default true
);
insert into public.gold_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3) Products
--    karat        : gold type (18 / 21 / 24)
--    gms          : weight in grams
--    constant_egp : fixed amount added to the price (workmanship, profit...)
--    image_url    : public Google Drive link (or any image URL)
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  int  not null references public.categories(id),
  name_ar      text not null,
  name_en      text not null default '',
  desc_ar      text not null default '',
  desc_en      text not null default '',
  metal        text not null default 'gold' check (metal in ('gold','silver')),
  karat        int  not null,
  gms          numeric(10,2) not null check (gms > 0),
  constant_egp numeric(12,2) not null default 0,
  image_url    text not null default '',          -- cover photo (= first of images)
  images       jsonb not null default '[]'::jsonb, -- list of photo links (first = cover)
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint products_karat_check check (
    (metal = 'gold' and karat in (18, 21, 24)) or (metal = 'silver' and karat in (800, 925, 999)))
);
create index if not exists products_category_idx on public.products(category_id);

-- What the website reads: products + live computed price.
create or replace view public.products_priced as
select
  p.id,
  c.slug as category,
  p.name_ar, p.name_en, p.desc_ar, p.desc_en,
  p.karat, p.gms, p.constant_egp, p.image_url, p.created_at,
  case when g.price_per_gram > 0
       then round(p.gms * g.price_per_gram + p.gms * 500)
  end as price,
  p.images,
  p.metal
from public.products p
join public.categories c on c.id = p.category_id and c.active
left join public.gold_prices g on g.karat = p.karat
where p.active;

-- ---------------------------------------------------------------------
-- 5) Row Level Security: visitors can only READ; nothing can be written
--    except through the admin_* functions below (which check the password).
-- ---------------------------------------------------------------------
alter table public.categories   enable row level security;
alter table public.gold_prices  enable row level security;
alter table public.gold_settings enable row level security;
alter table public.products     enable row level security;

drop policy if exists "public read categories"  on public.categories;
drop policy if exists "public read gold prices" on public.gold_prices;
create policy "public read categories"  on public.categories  for select using (active);
create policy "public read gold prices" on public.gold_prices for select using (true);
-- products, gold_settings, admin_users: no public policy => fully private.

grant select on public.products_priced to anon, authenticated;


-- ===== part 2: secure admin + settings (same as upgrade_v2.sql) =====
-- =====================================================================
-- Gamal Abo Hel'al — DATABASE UPGRADE v2  (secure admin + editable making charge)
--
-- WHO RUNS THIS?
--   * You already have the old database  -> run THIS file once.
--   * Brand-new Supabase project         -> run database/schema.sql instead (it already contains this file).
-- Where: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.   Safe to run again.
--
-- WHAT IT DOES
--   1. site_settings : the "making charge" (the old fixed 500 EGP per gram) becomes editable
--                      from the admin page, separately for gold and silver.
--   2. products_priced view : uses that setting instead of a hard-coded 500.
--   3. Admin login v2 : the password is checked ONCE, the server hands back a random session
--                      token (valid 2 hours) and every admin action uses that token. The password
--                      is never stored in the browser or sent again.
--   4. Brute-force lock : 4 wrong passwords from the same device/network -> locked for 30 minutes.
--                      Enforced here in the database, so it cannot be bypassed from the browser.
--   5. set_metal_prices : lets the automatic gold/silver updater (GitHub Action) write today's
--                      prices straight into the database (service key only).
--   6. The old admin_* functions (password sent on every call) are removed.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 0) Make sure older installs have the columns the site expects
-- ---------------------------------------------------------------------
alter table public.products add column if not exists metal  text  not null default 'gold';
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;

alter table public.products drop constraint if exists products_metal_check;
alter table public.products add  constraint products_metal_check check (metal in ('gold','silver'));
alter table public.products drop constraint if exists products_karat_check;
alter table public.products add  constraint products_karat_check check (
  (metal = 'gold'   and karat in (18, 21, 24)) or
  (metal = 'silver' and karat in (800, 925, 999)));

alter table public.gold_prices drop constraint if exists gold_prices_karat_check;
alter table public.gold_prices add  constraint gold_prices_karat_check check (karat in (18, 21, 24, 800, 925, 999));
insert into public.gold_prices (karat, price_per_gram, source) values
  (24, 0, 'initial'), (21, 0, 'initial'), (18, 0, 'initial'),
  (999, 0, 'initial'), (925, 0, 'initial'), (800, 0, 'initial')
on conflict (karat) do nothing;

-- ---------------------------------------------------------------------
-- 1) Editable making charge (EGP added per gram)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id                 int primary key default 1 check (id = 1),
  workmanship_gold   numeric(10,2) not null default 500 check (workmanship_gold   >= 0 and workmanship_gold   <= 100000),
  workmanship_silver numeric(10,2) not null default 500 check (workmanship_silver >= 0 and workmanship_silver <= 100000),
  updated_at         timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

alter table public.site_settings enable row level security;
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (true);

-- visitors may only READ prices/settings, never write
revoke insert, update, delete, truncate on public.site_settings from anon, authenticated;
revoke insert, update, delete, truncate on public.gold_prices   from anon, authenticated;
revoke insert, update, delete, truncate on public.categories    from anon, authenticated;
grant select on public.site_settings to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) What the website (and the chatbot) read: products + live price
--    price = (gms x gram price) + (gms x making charge from site_settings)
-- ---------------------------------------------------------------------
create or replace view public.products_priced as
select
  p.id,
  c.slug as category,
  p.name_ar, p.name_en, p.desc_ar, p.desc_en,
  p.karat, p.gms, p.constant_egp, p.image_url, p.created_at,
  case when g.price_per_gram > 0
       then round(p.gms * g.price_per_gram
                  + p.gms * (case when p.metal = 'silver' then s.workmanship_silver else s.workmanship_gold end))
  end as price,
  p.images,
  p.metal
from public.products p
join public.categories c on c.id = p.category_id and c.active
left join public.gold_prices g on g.karat = p.karat
cross join public.site_settings s
where p.active;
grant select on public.products_priced to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Admin accounts, sessions and the login-attempt log (all private)
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  name          text primary key,
  password_hash text not null
);
create table if not exists public.admin_sessions (
  token_hash text primary key,                 -- SHA-256 of the token; the token itself is never stored
  admin_name text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists public.admin_login_attempts (
  id      bigserial primary key,
  ip      text not null,
  name    text,
  success boolean not null,
  at      timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_at_idx on public.admin_login_attempts (ip, at);

alter table public.admin_users          enable row level security;   -- RLS on + no policy = invisible to the public API
alter table public.admin_sessions       enable row level security;
alter table public.admin_login_attempts enable row level security;
revoke all on public.admin_users, public.admin_sessions, public.admin_login_attempts from anon, authenticated;
revoke all on sequence public.admin_login_attempts_id_seq from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) Remove the old, weaker admin functions
-- ---------------------------------------------------------------------
drop function if exists public._admin_ok(text, text);
drop function if exists public.admin_login(text, text);
drop function if exists public.admin_list_products(text, text);
drop function if exists public.admin_save_product(text, text, jsonb);
drop function if exists public.admin_delete_product(text, text, uuid);
drop function if exists public.admin_set_gold(text, text, numeric, numeric, numeric, text, boolean);
drop function if exists public.admin_get_gold_settings(text, text);

-- ---------------------------------------------------------------------
-- 5) Helpers (not callable from the website)
-- ---------------------------------------------------------------------
-- The visitor's real IP as seen by Supabase's edge (Cloudflare sets cf-connecting-ip; a visitor cannot forge it).
-- If it is ever missing we fall back to ONE shared bucket ("unknown") — stricter, never weaker.
create or replace function public._client_ip()
returns text language plpgsql stable set search_path = public as $$
declare h jsonb;
begin
  begin h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then h := null; end;
  return coalesce(nullif(trim(h ->> 'cf-connecting-ip'), ''), 'unknown');
end $$;

-- token -> admin name (or null when missing / expired)
create or replace function public._admin_session(p_token text)
returns text language sql stable security definer set search_path = public, extensions as $$
  select admin_name from public.admin_sessions
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and expires_at > now();
$$;

revoke all on function public._client_ip()            from public, anon, authenticated;
revoke all on function public._admin_session(text)    from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6) Login: 4 wrong tries per 30 minutes per IP (+ a global safety net), then a session token
--    NOTE: it RETURNS the failure instead of raising an error, because a raised error would
--    roll back the "failed attempt" record and the lock would never trigger.
-- ---------------------------------------------------------------------
create or replace function public.admin_login(p_name text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ip      text     := public._client_ip();
  v_window  interval := interval '30 minutes';
  v_max     int      := 4;      -- wrong tries allowed per window, per IP
  v_gmax    int      := 40;     -- wrong tries allowed per window across ALL IPs (stops IP-rotating attacks)
  v_fails   int;  v_last timestamptz;
  v_gfails  int;  v_glast timestamptz;
  v_name    text; v_hash text; v_ok boolean := false; v_token text;
begin
  -- tidy old rows now and then
  if random() < 0.05 then
    delete from public.admin_login_attempts where at < now() - interval '3 days';
    delete from public.admin_sessions where expires_at < now();
  end if;

  select count(*), max(at) into v_fails, v_last
    from public.admin_login_attempts where ip = v_ip and not success and at > now() - v_window;
  if v_fails >= v_max then
    return jsonb_build_object('ok', false, 'locked', true,
      'retry_after', greatest(1, ceil(extract(epoch from (v_last + v_window - now())))::int));
  end if;

  select count(*), max(at) into v_gfails, v_glast
    from public.admin_login_attempts where not success and at > now() - v_window;
  if v_gfails >= v_gmax then
    return jsonb_build_object('ok', false, 'locked', true,
      'retry_after', greatest(1, ceil(extract(epoch from (v_glast + v_window - now())))::int));
  end if;

  select name, password_hash into v_name, v_hash
    from public.admin_users where lower(name) = lower(coalesce(trim(p_name), '')) limit 1;

  if v_hash is null then
    perform crypt(coalesce(p_password, ''), '$2a$10$abcdefghijklmnopqrstuu');   -- same work as a real check (no timing hint)
  else
    v_ok := crypt(coalesce(p_password, ''), v_hash) = v_hash;
  end if;

  if not v_ok then
    insert into public.admin_login_attempts (ip, name, success) values (v_ip, left(coalesce(p_name, ''), 60), false);
    return jsonb_build_object('ok', false, 'locked', (v_fails + 1) >= v_max,
      'remaining', greatest(0, v_max - (v_fails + 1)),
      'retry_after', case when (v_fails + 1) >= v_max then extract(epoch from v_window)::int else 0 end);
  end if;

  -- success: forget this IP's failures, open a 2-hour session
  delete from public.admin_login_attempts where ip = v_ip and not success;
  insert into public.admin_login_attempts (ip, name, success) values (v_ip, v_name, true);
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.admin_sessions (token_hash, admin_name, expires_at)
    values (encode(digest(v_token, 'sha256'), 'hex'), v_name, now() + interval '2 hours');
  delete from public.admin_sessions where admin_name = v_name and expires_at < now();
  return jsonb_build_object('ok', true, 'token', v_token, 'expires_in', 7200);
end $$;

create or replace function public.admin_check(p_token text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select public._admin_session(p_token) is not null;
$$;

create or replace function public.admin_logout(p_token text)
returns void language sql security definer set search_path = public, extensions as $$
  delete from public.admin_sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------
-- 7) Admin actions (all require a valid session token)
-- ---------------------------------------------------------------------
create or replace function public.admin_list_products(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if public._admin_session(p_token) is null then raise exception 'unauthorized'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select p.*, c.slug as category,
             case when g.price_per_gram > 0
                  then round(p.gms * g.price_per_gram
                             + p.gms * (case when p.metal = 'silver' then s.workmanship_silver else s.workmanship_gold end))
             end as price
      from public.products p
      join public.categories c on c.id = p.category_id
      left join public.gold_prices g on g.karat = p.karat
      cross join public.site_settings s
    ) x
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_save_product(p_token text, p jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare cid int; pid uuid; m text; imgs jsonb; img text;
begin
  if public._admin_session(p_token) is null then raise exception 'unauthorized'; end if;
  select id into cid from public.categories where slug = p ->> 'category';
  if cid is null then raise exception 'unknown category'; end if;
  m := case when p ->> 'metal' = 'silver' then 'silver' else 'gold' end;

  if coalesce(trim(p ->> 'name_ar'), '') = '' or length(p ->> 'name_ar') > 200 then raise exception 'invalid name'; end if;
  if length(coalesce(p ->> 'name_en', '')) > 200 or length(coalesce(p ->> 'desc_ar', '')) > 2000
     or length(coalesce(p ->> 'desc_en', '')) > 2000 then raise exception 'text too long'; end if;
  if coalesce((p ->> 'gms')::numeric, 0) <= 0 or (p ->> 'gms')::numeric > 100000 then raise exception 'invalid weight'; end if;

  imgs := coalesce(p -> 'images', '[]'::jsonb);
  if jsonb_typeof(imgs) <> 'array' or jsonb_array_length(imgs) > 12 then raise exception 'invalid images'; end if;
  for img in select jsonb_array_elements_text(imgs) loop
    if length(img) > 600 or img ~ '[<>"''\s]' then raise exception 'invalid image link'; end if;
  end loop;

  if nullif(p ->> 'id', '') is null then
    insert into public.products (category_id, metal, name_ar, name_en, desc_ar, desc_en,
                                 karat, gms, constant_egp, image_url, images, active)
    values (cid, m, trim(p ->> 'name_ar'), coalesce(trim(p ->> 'name_en'), ''),
            coalesce(trim(p ->> 'desc_ar'), ''), coalesce(trim(p ->> 'desc_en'), ''),
            (p ->> 'karat')::int, (p ->> 'gms')::numeric, 0,
            coalesce(imgs ->> 0, ''), imgs,
            coalesce((p ->> 'active')::boolean, true))
    returning id into pid;
  else
    update public.products set
      category_id = cid, metal = m,
      name_ar = trim(p ->> 'name_ar'), name_en = coalesce(trim(p ->> 'name_en'), ''),
      desc_ar = coalesce(trim(p ->> 'desc_ar'), ''), desc_en = coalesce(trim(p ->> 'desc_en'), ''),
      karat = (p ->> 'karat')::int, gms = (p ->> 'gms')::numeric, constant_egp = 0,
      image_url = coalesce(imgs ->> 0, ''), images = imgs,
      active = coalesce((p ->> 'active')::boolean, true)
    where id = (p ->> 'id')::uuid
    returning id into pid;
    if pid is null then raise exception 'product not found'; end if;
  end if;
  return pid;
end $$;

create or replace function public.admin_delete_product(p_token text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if public._admin_session(p_token) is null then raise exception 'unauthorized'; end if;
  delete from public.products where id = p_id;
end $$;

-- the editable making charge (EGP per gram), separately for gold and silver
create or replace function public.admin_set_settings(p_token text, p_gold numeric, p_silver numeric)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if public._admin_session(p_token) is null then raise exception 'unauthorized'; end if;
  if p_gold is null or p_silver is null or p_gold < 0 or p_silver < 0 or p_gold > 100000 or p_silver > 100000 then
    raise exception 'invalid amount';
  end if;
  update public.site_settings
     set workmanship_gold = round(p_gold, 2), workmanship_silver = round(p_silver, 2), updated_at = now()
   where id = 1;
  return (select to_jsonb(s) from public.site_settings s where id = 1);
end $$;

-- ---------------------------------------------------------------------
-- 8) Automatic gold / silver price writer (called by the GitHub Action with the SECRET key only)
--    p looks like {"24":7065.6,"21":6182.4,"18":5299.2,"999":95.1,"925":88.0,"800":76.1}
-- ---------------------------------------------------------------------
create or replace function public.set_metal_prices(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k text; v numeric;
begin
  for k, v in select key, value::numeric from jsonb_each_text(p) loop
    if k in ('18', '21', '24', '800', '925', '999') and v > 0 and v < 10000000 then
      insert into public.gold_prices (karat, price_per_gram, source, updated_at)
      values (k::int, round(v, 2), 'auto', now())
      on conflict (karat) do update
        set price_per_gram = excluded.price_per_gram, source = 'auto', updated_at = now();
    end if;
  end loop;
end $$;
revoke all on function public.set_metal_prices(jsonb) from public, anon, authenticated;
grant execute on function public.set_metal_prices(jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 9) Who may call what
-- ---------------------------------------------------------------------
revoke all on function
  public.admin_login(text, text), public.admin_check(text), public.admin_logout(text),
  public.admin_list_products(text), public.admin_save_product(text, jsonb),
  public.admin_delete_product(text, uuid), public.admin_set_settings(text, numeric, numeric)
from public;
grant execute on function
  public.admin_login(text, text), public.admin_check(text), public.admin_logout(text),
  public.admin_list_products(text), public.admin_save_product(text, jsonb),
  public.admin_delete_product(text, uuid), public.admin_set_settings(text, numeric, numeric)
to anon, authenticated;

notify pgrst, 'reload schema';   -- make the API notice the new functions straight away

-- =====================================================================
-- NEXT STEP (separate): create / reset your admin account -> database/create_admin.sql
-- =====================================================================
