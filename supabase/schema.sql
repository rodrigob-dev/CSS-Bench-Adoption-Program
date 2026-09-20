-- Bench Adoption Program — schema
-- Run in the Supabase SQL editor (or: psql "$DATABASE_URL" -f supabase/schema.sql).
-- Re-runnable: drops everything first.
drop function if exists adopt_bench(text, text, text, text);
drop function if exists adopt_bench(text, text, text, text, text, text, text, boolean);
drop view if exists area_summary;
drop view if exists bench_sides;
drop table if exists adoptions;
drop table if exists benches;
drop table if exists areas;

-- ---------------------------------------------------------------------------
-- Areas: how the park is divided for navigation. A person picks an area,
-- then a bench inside it. Area outlines live with the map (src/lib/park.ts).
-- ---------------------------------------------------------------------------
create table areas (
  id          text primary key,            -- slug, e.g. 'great-lawn'
  name        text not null,
  description text not null default '',
  sort_order  int not null default 0
);

-- ---------------------------------------------------------------------------
-- Benches: the physical unit, with its position. The park has been mapped,
-- so every bench has coordinates (park-local metres here; lat/lng for a real
-- survey). `installed = false` marks a pre-approved slot where a new bench
-- may be installed and adopted. Slots are rows, not a "click anywhere"
-- handler, because the park decides where new benches may go.
-- ---------------------------------------------------------------------------
create table benches (
  id        text primary key,              -- inventory tag, e.g. 'RB-0214'
  area_id   text not null references areas (id),
  style     text not null check (style in ('worlds_fair', 'concrete')),
  size_ft   int  not null check (size_ft in (4, 8)),
  installed boolean not null default true,
  pos_x     double precision not null,
  pos_y     double precision not null
);

create index benches_area_idx on benches (area_id);

-- ---------------------------------------------------------------------------
-- Adoptions: one row per adoption event. The unit of adoption is a bench SIDE:
-- an 8 ft bench has sides A and B, a 4 ft bench only has A. Rows are never
-- deleted, so a bench accumulates history; at most one row per side is active.
-- ---------------------------------------------------------------------------
create table adoptions (
  id          uuid primary key default gen_random_uuid(),
  bench_id    text not null references benches (id),
  side        text not null check (side in ('A', 'B')),
  kind        text not null check (kind in ('adopt', 'install_and_adopt')),
  -- the fields of VCPA's adoption form, minus payment
  donor_name  text not null check (length(trim(donor_name)) between 1 and 80),
  donor_email text not null check (donor_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  honoree_name text check (length(honoree_name) <= 120),           -- "in honor or in memory of"
  plaque_text text not null check (
    length(plaque_text) between 1 and 300                            -- VCPA: max 300 characters
    and array_length(string_to_array(plaque_text, E'\n'), 1) <= 7   -- VCPA: max 7 lines
  ),
  notes       text check (length(notes) <= 1000),                   -- "any additional questions?"
  timeline_acknowledged boolean not null check (timeline_acknowledged), -- "I understand the 6-8 week timeline"

  amount_usd  int not null check (amount_usd > 0),
  adopted_at  timestamptz not null default now(),
  term_years  int not null default 10 check (term_years > 0),      -- VCPA term is 10 years
  status      text not null default 'active'
              check (status in ('active', 'expired', 'cancelled'))
);

create index adoptions_bench_idx on adoptions (bench_id);

-- The actual concurrency fix. Two requests can both read "open" and both try
-- to insert; the database lets exactly one through. The WHERE makes it a
-- partial index, so the rule only applies to active rows and history is kept.
create unique index one_active_adoption_per_side
  on adoptions (bench_id, side)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- bench_sides: one row per adoptable side, joined to its active adoption.
-- `expires_at` and `side_status` are computed on read, never stored.
-- A lapsed term reads as 'open'; the stale row is flipped to 'expired' by
-- adopt_bench() the next time someone adopts that side.
-- A slot (installed = false) exposes only side A: the install donor takes it,
-- and side B becomes adoptable once the park installs the bench and flips the flag.
-- ---------------------------------------------------------------------------
create view bench_sides as
select
  b.id        as bench_id,
  b.area_id,
  b.style,
  b.size_ft,
  b.installed,
  b.pos_x,
  b.pos_y,
  s.side,
  a.id        as adoption_id,
  a.kind,
  a.donor_name,
  a.honoree_name,
  a.plaque_text,
  a.amount_usd,
  a.adopted_at,
  a.term_years,
  a.adopted_at + make_interval(years => a.term_years) as expires_at,
  case
    when a.id is null then 'open'
    when a.adopted_at + make_interval(years => a.term_years) <= now() then 'open'
    else 'adopted'
  end as side_status
from benches b
cross join (values ('A'), ('B')) as s (side)
left join adoptions a
  on a.bench_id = b.id and a.side = s.side and a.status = 'active'
where s.side = 'A' or (b.size_ft = 8 and b.installed);

-- ---------------------------------------------------------------------------
-- area_summary: counts per area for the map and the area list.
-- ---------------------------------------------------------------------------
create view area_summary as
select
  ar.id, ar.name, ar.description, ar.sort_order,
  count(distinct bs.bench_id) filter (where bs.installed)                          as benches_total,
  count(*)                    filter (where bs.installed)                          as sides_total,
  count(*)                    filter (where bs.installed and bs.side_status = 'open') as sides_open,
  count(distinct bs.bench_id) filter (where not bs.installed and bs.side_status = 'open') as slots_open
from areas ar
left join bench_sides bs on bs.area_id = ar.id
group by ar.id;

-- ---------------------------------------------------------------------------
-- adopt_bench: the only write path. Runs in one transaction:
--   1. validate the side exists for this bench size
--   2. lazily expire a lapsed active row on that side (no cron needed)
--   3. insert the new adoption — the partial unique index rejects a second
--      concurrent insert with SQLSTATE 23505, which the app turns into
--      "someone just adopted this bench".
-- ---------------------------------------------------------------------------
create or replace function adopt_bench(
  p_bench_id     text,
  p_side         text,
  p_donor_name   text,
  p_donor_email  text,
  p_plaque_text  text,
  p_honoree_name text default null,
  p_notes        text default null,
  p_timeline_ack boolean default false
) returns adoptions
language plpgsql
as $$
declare
  v_bench benches%rowtype;
  v_row   adoptions%rowtype;
begin
  select * into v_bench from benches where id = p_bench_id;
  if not found then
    raise exception 'bench_not_found' using errcode = 'P0002';
  end if;
  if p_side = 'B' and (v_bench.size_ft <> 8 or not v_bench.installed) then
    raise exception 'side_not_available' using errcode = 'P0001';
  end if;

  update adoptions
     set status = 'expired'
   where bench_id = p_bench_id
     and side = p_side
     and status = 'active'
     and adopted_at + make_interval(years => term_years) <= now();

  insert into adoptions (bench_id, side, kind, donor_name, donor_email, honoree_name,
                         plaque_text, notes, timeline_acknowledged, amount_usd)
  values (
    p_bench_id,
    p_side,
    case when v_bench.installed then 'adopt' else 'install_and_adopt' end,
    trim(p_donor_name),
    lower(trim(p_donor_email)),
    nullif(trim(p_honoree_name), ''),
    trim(p_plaque_text),
    nullif(trim(p_notes), ''),
    p_timeline_ack,
    case when v_bench.installed then 3500 else 5500 end
  )
  returning * into v_row;

  return v_row;
end
$$;
