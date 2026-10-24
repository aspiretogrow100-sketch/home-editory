-- Public gallery that works with only the publishable (anon) key.
-- Run once in the Supabase SQL Editor of the project the site points to.
--
-- Why a function instead of open SELECT policies:
--   * An anon SELECT policy on public.generations would expose every column
--     (user_id, amazon_products) through the REST API, so anyone could read the
--     paid shopping list of a locked design without paying.
--   * Postgres RLS filters rows, not columns, so a policy on public.transactions
--     cannot hide amounts or user ids from anon.
-- The function below runs with the owner's rights and returns only what the
-- gallery shows: safe columns, unlock counts, and products only for designs
-- that are already unlocked. The tables themselves stay closed to anon.

-- 1. Keep RLS on (no-op if already enabled). No new anon table policies.
alter table public.generations enable row level security;
alter table public.transactions enable row level security;

-- 2. Gallery feed function.
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
    select gen.*
    from public.generations gen
    where gen.image_url is not null
    order by gen.created_at desc
    limit least(greatest(coalesce(max_rows, 60), 1), 200)
  ),
  priced as (
    select
      g.id,
      count(p.item)::integer as item_count,
      coalesce(sum(case when (p.item->>'price') ~ '^[0-9]+(\.[0-9]+)?$'
                        then (p.item->>'price')::numeric end), 0) as total,
      coalesce(sum(case
                      when (p.item->>'listPrice') ~ '^[0-9]+(\.[0-9]+)?$'
                        then (p.item->>'listPrice')::numeric
                      when (p.item->>'price') ~ '^[0-9]+(\.[0-9]+)?$'
                        then (p.item->>'price')::numeric
                    end), 0) as list_total
    from g
    left join lateral jsonb_array_elements(
      case when jsonb_typeof(g.amazon_products::jsonb) = 'array'
           then g.amazon_products::jsonb else '[]'::jsonb end
    ) as p(item) on true
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
    case when g.is_unlocked then g.amazon_products::jsonb else '[]'::jsonb end,
    g.is_unlocked::boolean,
    pr.item_count,
    pr.total,
    pr.list_total,
    coalesce(u.unlock_count, 0)::bigint
  from g
  join priced pr on pr.id = g.id
  left join unlocks u on u.generation_id = g.id
  order by g.created_at desc;
$$;

revoke all on function public.list_public_gallery(integer) from public;
grant execute on function public.list_public_gallery(integer) to anon, authenticated;

-- 3. Gallery images: make the "designs" bucket public so images load from
--    their public URL without signed URLs (no service key needed).
--    Note: every file in this bucket becomes readable by anyone who has its URL.
update storage.buckets set public = true where id = 'designs';
