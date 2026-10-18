-- =====================================================================
-- UPGRADE: silver products + new price rule.
-- Run ONCE in Supabase -> SQL Editor (safe to run again). Existing products are kept (they stay gold).
--
-- New price rule (gold and silver):
--     price = (gms x price per gram) + (gms x 500 EGP)
-- The old per-product "constant_egp" column is no longer used.
-- For silver, the "karat" column holds the purity: 800 / 925 / 999.
-- =====================================================================
alter table public.products add column if not exists metal text not null default 'gold';

alter table public.products drop constraint if exists products_metal_check;
alter table public.products add constraint products_metal_check check (metal in ('gold','silver'));

alter table public.products drop constraint if exists products_karat_check;
alter table public.products add constraint products_karat_check check (
  (metal = 'gold'   and karat in (18, 21, 24)) or
  (metal = 'silver' and karat in (800, 925, 999))
);

alter table public.gold_prices drop constraint if exists gold_prices_karat_check;
alter table public.gold_prices add constraint gold_prices_karat_check check (karat in (18, 21, 24, 800, 925, 999));
insert into public.gold_prices (karat, price_per_gram, source) values
  (999, 0, 'initial'), (925, 0, 'initial'), (800, 0, 'initial')
on conflict (karat) do nothing;

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
grant select on public.products_priced to anon, authenticated;

create or replace function public.admin_list_products(p_name text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _admin_ok(p_name, p_password) then raise exception 'unauthorized'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select p.*, c.slug as category,
             case when g.price_per_gram > 0
                  then round(p.gms * g.price_per_gram + p.gms * 500) end as price
      from products p
      join categories c on c.id = p.category_id
      left join gold_prices g on g.karat = p.karat
    ) x
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_save_product(p_name text, p_password text, p jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare cid int; pid uuid; m text;
begin
  if not _admin_ok(p_name, p_password) then raise exception 'unauthorized'; end if;
  select id into cid from categories where slug = p->>'category';
  if cid is null then raise exception 'unknown category'; end if;
  m := case when p->>'metal' = 'silver' then 'silver' else 'gold' end;

  if nullif(p->>'id','') is null then
    insert into products (category_id, metal, name_ar, name_en, desc_ar, desc_en,
                          karat, gms, constant_egp, image_url, images, active)
    values (cid, m, p->>'name_ar', coalesce(p->>'name_en',''),
            coalesce(p->>'desc_ar',''), coalesce(p->>'desc_en',''),
            (p->>'karat')::int, (p->>'gms')::numeric, 0,
            coalesce(p->'images'->>0, p->>'image_url', ''), coalesce(p->'images', '[]'::jsonb),
            coalesce((p->>'active')::boolean, true))
    returning id into pid;
  else
    update products set
      category_id = cid, metal = m,
      name_ar = p->>'name_ar', name_en = coalesce(p->>'name_en',''),
      desc_ar = coalesce(p->>'desc_ar',''), desc_en = coalesce(p->>'desc_en',''),
      karat = (p->>'karat')::int, gms = (p->>'gms')::numeric, constant_egp = 0,
      image_url = coalesce(p->'images'->>0, p->>'image_url', ''),
      images = coalesce(p->'images', '[]'::jsonb),
      active = coalesce((p->>'active')::boolean, true)
    where id = (p->>'id')::uuid
    returning id into pid;
  end if;
  return pid;
end $$;
grant execute on function public.admin_save_product(text,text,jsonb) to anon, authenticated;
