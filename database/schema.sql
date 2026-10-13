-- =====================================================================
-- Gamal Abo Hel'al — database schema (Supabase / PostgreSQL)
-- Run this whole file ONCE in:  Supabase dashboard -> SQL Editor -> New query -> Run
-- It is safe to run again (uses "if not exists" / "or replace").
--
-- Price rule (computed inside the database, always fresh):
--     price = gms * (today's gold price per gram for the product's karat) + constant_egp
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
  karat          int primary key check (karat in (18, 21, 24)),
  price_per_gram numeric(12,2) not null default 0,
  source         text,
  updated_at     timestamptz not null default now()
);

insert into public.gold_prices (karat, price_per_gram, source) values
  (24, 0, 'initial'), (21, 0, 'initial'), (18, 0, 'initial')
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
  karat        int  not null check (karat in (18, 21, 24)),
  gms          numeric(10,2) not null check (gms > 0),
  constant_egp numeric(12,2) not null default 0,
  image_url    text not null default '',          -- cover photo (= first of images)
  images       jsonb not null default '[]'::jsonb, -- list of photo links (first = cover)
  active       boolean not null default true,
  created_at   timestamptz not null default now()
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
       then round(p.gms * g.price_per_gram + p.constant_egp)
  end as price,
  p.images
from public.products p
join public.categories c on c.id = p.category_id and c.active
left join public.gold_prices g on g.karat = p.karat
where p.active;

-- ---------------------------------------------------------------------
-- 4) Temporary admin users (name + password, password stored hashed)
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  name          text primary key,
  password_hash text not null
);

-- ---------------------------------------------------------------------
-- 5) Row Level Security: visitors can only READ; nothing can be written
--    except through the admin_* functions below (which check the password).
-- ---------------------------------------------------------------------
alter table public.categories   enable row level security;
alter table public.gold_prices  enable row level security;
alter table public.gold_settings enable row level security;
alter table public.products     enable row level security;
alter table public.admin_users  enable row level security;

drop policy if exists "public read categories"  on public.categories;
drop policy if exists "public read gold prices" on public.gold_prices;
create policy "public read categories"  on public.categories  for select using (active);
create policy "public read gold prices" on public.gold_prices for select using (true);
-- products, gold_settings, admin_users: no public policy => fully private.

grant select on public.products_priced to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6) Admin functions (SECURITY DEFINER = run with owner rights, after
--    verifying name + password). A wrong password waits 1s (slows guessing).
-- ---------------------------------------------------------------------
create or replace function public._admin_ok(p_name text, p_password text)
returns boolean language plpgsql security definer
set search_path = public, extensions as $$
declare ok boolean;
begin
  select exists (
    select 1 from admin_users
    where lower(name) = lower(coalesce(p_name,''))
      and password_hash = crypt(coalesce(p_password,''), password_hash)
  ) into ok;
  if not ok then perform pg_sleep(1); end if;
  return ok;
end $$;
revoke all on function public._admin_ok(text, text) from public, anon, authenticated;

create or replace function public.admin_login(p_name text, p_password text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select public._admin_ok(p_name, p_password);
$$;

-- All products (including hidden ones) with computed price
create or replace function public.admin_list_products(p_name text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _admin_ok(p_name, p_password) then raise exception 'unauthorized'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select p.*, c.slug as category,
             case when g.price_per_gram > 0
                  then round(p.gms * g.price_per_gram + p.constant_egp) end as price
      from products p
      join categories c on c.id = p.category_id
      left join gold_prices g on g.karat = p.karat
    ) x
  ), '[]'::jsonb);
end $$;

-- Create (no "id" in p) or update (with "id") a product
create or replace function public.admin_save_product(p_name text, p_password text, p jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare cid int; pid uuid;
begin
  if not _admin_ok(p_name, p_password) then raise exception 'unauthorized'; end if;
  select id into cid from categories where slug = p->>'category';
  if cid is null then raise exception 'unknown category'; end if;

  if nullif(p->>'id','') is null then
    insert into products (category_id, name_ar, name_en, desc_ar, desc_en,
                          karat, gms, constant_egp, image_url, images, active)
    values (cid, p->>'name_ar', coalesce(p->>'name_en',''),
            coalesce(p->>'desc_ar',''), coalesce(p->>'desc_en',''),
            (p->>'karat')::int, (p->>'gms')::numeric,
            coalesce(nullif(p->>'constant_egp','')::numeric, 0),
            coalesce(p->'images'->>0, p->>'image_url', ''), coalesce(p->'images', '[]'::jsonb),
            coalesce((p->>'active')::boolean, true))
    returning id into pid;
  else
    update products set
      category_id = cid,
      name_ar = p->>'name_ar', name_en = coalesce(p->>'name_en',''),
      desc_ar = coalesce(p->>'desc_ar',''), desc_en = coalesce(p->>'desc_en',''),
      karat = (p->>'karat')::int, gms = (p->>'gms')::numeric,
      constant_egp = coalesce(nullif(p->>'constant_egp','')::numeric, 0),
      image_url = coalesce(p->'images'->>0, p->>'image_url', ''),
      images = coalesce(p->'images', '[]'::jsonb),
      active = coalesce((p->>'active')::boolean, true)
    where id = (p->>'id')::uuid
    returning id into pid;
  end if;
  return pid;
end $$;

create or replace function public.admin_delete_product(p_name text, p_password text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _admin_ok(p_name, p_password) then raise exception 'unauthorized'; end if;
  delete from products where id = p_id;
end $$;

-- Manual gold price entry from the admin page (24k given; 21k/18k derived
-- unless you pass them). Also lets you switch the automatic updater on/off.
create or replace function public.admin_set_gold(
  p_name text, p_password text,
  p24 numeric, p21 numeric, p18 numeric,
  p_source text default 'manual', p_auto boolean default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _admin_ok(p_name, p_password) then raise exception 'unauthorized'; end if;
  update gold_prices set price_per_gram = p24, source = p_source, updated_at = now() where karat = 24;
  update gold_prices set price_per_gram = p21, source = p_source, updated_at = now() where karat = 21;
  update gold_prices set price_per_gram = p18, source = p_source, updated_at = now() where karat = 18;
  if p_auto is not null then update gold_settings set auto_update = p_auto where id = 1; end if;
end $$;

create or replace function public.admin_get_gold_settings(p_name text, p_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare a boolean;
begin
  if not _admin_ok(p_name, p_password) then raise exception 'unauthorized'; end if;
  select auto_update into a from gold_settings where id = 1;
  return a;
end $$;

grant execute on function
  public.admin_login(text,text),
  public.admin_list_products(text,text),
  public.admin_save_product(text,text,jsonb),
  public.admin_delete_product(text,text,uuid),
  public.admin_set_gold(text,text,numeric,numeric,numeric,text,boolean),
  public.admin_get_gold_settings(text,text)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7) CREATE YOUR TEMPORARY ADMIN  (edit name + password, then run this line)
--    To remove admin access later:  delete from public.admin_users;
-- ---------------------------------------------------------------------
-- insert into public.admin_users (name, password_hash)
-- values ('gamal', extensions.crypt('PUT-A-STRONG-PASSWORD-HERE', extensions.gen_salt('bf')))
-- on conflict (name) do update set password_hash = excluded.password_hash;
