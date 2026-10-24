-- Gallery + partner (featured) products.
-- Replaces list_public_gallery from 20261024180000 so that:
--   * featured partner items (amazon_products elements with "featured": true) are
--     always returned, even for locked designs, because they are sponsored items;
--   * the regular shopping list is still returned only for unlocked designs;
--   * item_count / total / list_total count only the regular items.
-- Safe to run more than once. Run it in the SQL Editor of the database the site uses
-- (the site also works without it on hosts that have the service key).

alter table public.generations enable row level security;
alter table public.transactions enable row level security;

create or replace function public.list_public_gallery(max_rows integer default 60)
returns table (
  id uuid,
  room_type text,
  design_style text,
  budget_range text,
  created_at timestamptz,
  image_url text,
  amazon_products jsonb,
  is_unlocked boolean,
  item_count integer,
  total numeric,
  list_total numeric,
  unlock_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with g as (
    select gen.*,
           case when jsonb_typeof(gen.amazon_products::jsonb) = 'array'
                then gen.amazon_products::jsonb else '[]'::jsonb end as items
    from public.generations gen
    where gen.image_url is not null
    order by gen.created_at desc
    limit least(greatest(coalesce(max_rows, 60), 1), 200)
  ),
  split as (
    select
      g.id,
      coalesce(jsonb_agg(p.item) filter (where coalesce(p.item->>'featured', '') = 'true'), '[]'::jsonb) as featured,
      count(p.item) filter (where coalesce(p.item->>'featured', '') <> 'true')::integer as item_count,
      coalesce(sum(case when coalesce(p.item->>'featured', '') <> 'true'
                         and (p.item->>'price') ~ '^[0-9]+(\.[0-9]+)?$'
                        then (p.item->>'price')::numeric end), 0) as total,
      coalesce(sum(case
                      when coalesce(p.item->>'featured', '') = 'true' then null
                      when (p.item->>'listPrice') ~ '^[0-9]+(\.[0-9]+)?$'
                        then (p.item->>'listPrice')::numeric
                      when (p.item->>'price') ~ '^[0-9]+(\.[0-9]+)?$'
                        then (p.item->>'price')::numeric
                    end), 0) as list_total
    from g
    left join lateral jsonb_array_elements(g.items) as p(item) on true
    group by g.id
  ),
  unlocks as (
    select t.generation_id, count(*) as unlock_count
    from public.transactions t
    where t.payment_status = 'completed'
      and t.generation_id in (select g.id from g)
    group by t.generation_id
  )
  select
    g.id::uuid,
    g.room_type::text,
    g.design_style::text,
    g.budget_range::text,
    g.created_at::timestamptz,
    g.image_url::text,
    case when g.is_unlocked then g.items else sp.featured end,
    g.is_unlocked::boolean,
    sp.item_count,
    sp.total,
    sp.list_total,
    coalesce(u.unlock_count, 0)::bigint
  from g
  join split sp on sp.id = g.id
  left join unlocks u on u.generation_id = g.id
  order by g.created_at desc;
$$;

revoke all on function public.list_public_gallery(integer) from public;
grant execute on function public.list_public_gallery(integer) to anon, authenticated;

-- Gallery images load from their public URL.
update storage.buckets set public = true where id = 'designs';
