-- =====================================================================
-- UPGRADE: several photos per product.
-- Run ONCE in Supabase -> SQL Editor (safe to run again). Your existing products are kept.
-- =====================================================================
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;

-- existing single photos become the first entry of the list
update public.products
   set images = jsonb_build_array(image_url)
 where image_url <> '' and images = '[]'::jsonb;

-- the website view now also returns the list of photos
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
grant select on public.products_priced to anon, authenticated;

-- save function now stores the photo list (first photo = cover)
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
grant execute on function public.admin_save_product(text,text,jsonb) to anon, authenticated;
