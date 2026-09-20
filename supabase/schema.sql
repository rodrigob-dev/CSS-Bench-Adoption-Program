-- Bench Adoption Program — schema
-- Run in the Supabase SQL editor (or: psql "$DATABASE_URL" -f supabase/schema.sql).
-- Re-runnable: drops everything first.
drop function if exists adopt_bench(text, text, text, text);
drop function if exists adopt_bench(text, text, text, text, text, text, text, boolean);
drop function if exists adopt_bench(text, text, text, text, text, text, text, boolean, text);
drop function if exists hold_plaque(text, text, text);
drop function if exists release_hold(text, text, text);
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
-- Adoptions: one row per adoption event. The unit of adoption is a plaque
-- position (a bench SIDE): an 8 ft bench has A (left) and B (right), a 4 ft
-- bench only A. Rows are never deleted, so a bench accumulates history.
--
-- A row starts as a 'held' reservation the moment someone opens the form
-- (10 minutes, see hold_plaque), becomes 'active' when they submit, and is
-- later 'expired' or 'cancelled'. At most one row per side is held-or-active.
-- ---------------------------------------------------------------------------
create table adoptions (
  id          uuid primary key default gen_random_uuid(),
  bench_id    text not null references benches (id),
  side        text not null check (side in ('A', 'B')),
  kind        text not null check (kind in ('adopt', 'install_and_adopt')),
  status      text not null default 'active'
              check (status in ('held', 'active', 'expired', 'cancelled')),
  -- reservation (only meaningful while status = 'held')
  hold_token  text,                          -- random per-browser secret
  held_until  timestamptz,
  -- the fields of VCPA's adoption form, minus payment (null only while held)
  donor_name  text check (donor_name is null or length(trim(donor_name)) between 1 and 80),
  donor_email text check (donor_email is null or donor_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  honoree_name text check (length(honoree_name) <= 120),           -- "in honor or in memory of"
  plaque_text text check (
    plaque_text is null or (
      length(plaque_text) between 1 and 300                          -- VCPA: max 300 characters
      and array_length(string_to_array(plaque_text, E'\n'), 1) <= 7 -- VCPA: max 7 lines
    )
  ),
  notes       text check (length(notes) <= 1000),                   -- "any additional questions?"
  timeline_acknowledged boolean not null default false,             -- "I understand the 6-8 week timeline"
  amount_usd  int check (amount_usd > 0),
  adopted_at  timestamptz not null default now(),
  term_years  int not null default 10 check (term_years > 0),      -- VCPA term is 10 years
  -- a real adoption has the whole form; a hold (live or cancelled) has a token and a deadline
  check (
    (status in ('held', 'cancelled') and hold_token is not null and held_until is not null)
    or (status <> 'held' and donor_name is not null and donor_email is not null
        and plaque_text is not null and timeline_acknowledged and amount_usd is not null)
  )
);

create index adoptions_bench_idx on adoptions (bench_id);

-- The actual concurrency fix. Two requests can both read "open" and both try
-- to insert; the database lets exactly one through. The WHERE makes it a
-- partial index: it only constrains live rows (held or active), so history
-- rows can pile up underneath.
create unique index one_live_adoption_per_side
  on adoptions (bench_id, side)
  where status in ('held', 'active');

-- ---------------------------------------------------------------------------
-- bench_sides: one row per adoptable side, joined to its live adoption.
-- `expires_at` and `side_status` are computed on read, never stored.
-- A lapsed term or an expired hold reads as 'open'; the stale row is flipped
-- to 'expired' / 'cancelled' by hold_plaque()/adopt_bench() the next time
-- someone touches that side.
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
  case when a.status = 'active' then a.donor_name end   as donor_name,
  case when a.status = 'active' then a.honoree_name end as honoree_name,
  case when a.status = 'active' then a.plaque_text end  as plaque_text,
  case when a.status = 'active' then a.amount_usd end   as amount_usd,
  case when a.status = 'active' then a.adopted_at end   as adopted_at,
  case when a.status = 'active' then a.term_years end   as term_years,
  case when a.status = 'active' then a.adopted_at + make_interval(years => a.term_years) end as expires_at,
  case when a.status = 'held' and a.held_until > now() then a.held_until end as held_until,
  case
    when a.id is null then 'open'
    when a.status = 'held' then case when a.held_until > now() then 'held' else 'open' end
    when a.adopted_at + make_interval(years => a.term_years) <= now() then 'open'
    else 'adopted'
  end as side_status
from benches b
cross join (values ('A'), ('B')) as s (side)
left join adoptions a
  on a.bench_id = b.id and a.side = s.side and a.status in ('held', 'active')
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
-- Write path. Three functions, one transaction each:
--
--   hold_plaque()   when someone opens the adoption form: reserves the side
--                   for 10 minutes under a per-browser token. Refused if
--                   another live row exists (SQLSTATE 23505 from the index).
--   adopt_bench()   when they submit: turns their hold into an active adoption
--                   (or inserts one directly if no hold was taken — the index
--                   still guarantees at most one).
--   release_hold()  when they cancel: frees the side immediately.
--
-- Lapsed terms and expired holds are cleaned up lazily at the start of each
-- call, on that side only, so no scheduled job is needed.
-- ---------------------------------------------------------------------------
create or replace function sweep_side(p_bench_id text, p_side text) returns void
language sql as $$
  update adoptions set status = 'expired'
   where bench_id = p_bench_id and side = p_side and status = 'active'
     and adopted_at + make_interval(years => term_years) <= now();
  update adoptions set status = 'cancelled'
   where bench_id = p_bench_id and side = p_side and status = 'held'
     and held_until <= now();
$$;

create or replace function hold_plaque(p_bench_id text, p_side text, p_token text)
returns timestamptz
language plpgsql
as $$
declare
  v_bench benches%rowtype;
  v_until timestamptz;
begin
  select * into v_bench from benches where id = p_bench_id;
  if not found then raise exception 'bench_not_found' using errcode = 'P0002'; end if;
  if p_side = 'B' and (v_bench.size_ft <> 8 or not v_bench.installed) then
    raise exception 'side_not_available' using errcode = 'P0001';
  end if;
  perform sweep_side(p_bench_id, p_side);

  -- renewing your own hold just extends it
  update adoptions set held_until = now() + interval '10 minutes'
   where bench_id = p_bench_id and side = p_side and status = 'held' and hold_token = p_token
  returning held_until into v_until;
  if found then return v_until; end if;

  insert into adoptions (bench_id, side, kind, status, hold_token, held_until)
  values (p_bench_id, p_side,
          case when v_bench.installed then 'adopt' else 'install_and_adopt' end,
          'held', p_token, now() + interval '10 minutes')
  returning held_until into v_until;   -- 23505 here = someone else is live on this side
  return v_until;
end
$$;

create or replace function release_hold(p_bench_id text, p_side text, p_token text) returns void
language sql as $$
  update adoptions set status = 'cancelled'
   where bench_id = p_bench_id and side = p_side and status = 'held' and hold_token = p_token;
$$;

create or replace function adopt_bench(
  p_bench_id     text,
  p_side         text,
  p_donor_name   text,
  p_donor_email  text,
  p_plaque_text  text,
  p_honoree_name text default null,
  p_notes        text default null,
  p_timeline_ack boolean default false,
  p_token        text default null
) returns adoptions
language plpgsql
as $$
declare
  v_bench benches%rowtype;
  v_row   adoptions%rowtype;
begin
  select * into v_bench from benches where id = p_bench_id;
  if not found then raise exception 'bench_not_found' using errcode = 'P0002'; end if;
  if p_side = 'B' and (v_bench.size_ft <> 8 or not v_bench.installed) then
    raise exception 'side_not_available' using errcode = 'P0001';
  end if;
  perform sweep_side(p_bench_id, p_side);

  -- convert my own hold, keeping its row
  update adoptions
     set status = 'active',
         donor_name = trim(p_donor_name),
         donor_email = lower(trim(p_donor_email)),
         honoree_name = nullif(trim(p_honoree_name), ''),
         plaque_text = trim(p_plaque_text),
         notes = nullif(trim(p_notes), ''),
         timeline_acknowledged = p_timeline_ack,
         amount_usd = case when v_bench.installed then 3500 else 5500 end,
         adopted_at = now(),
         hold_token = null, held_until = null
   where bench_id = p_bench_id and side = p_side and status = 'held'
     and p_token is not null and hold_token = p_token
  returning * into v_row;
  if found then return v_row; end if;

  -- no hold: insert directly; the partial unique index rejects a concurrent
  -- insert (or someone else's live hold) with SQLSTATE 23505
  insert into adoptions (bench_id, side, kind, status, donor_name, donor_email, honoree_name,
                         plaque_text, notes, timeline_acknowledged, amount_usd)
  values (
    p_bench_id, p_side,
    case when v_bench.installed then 'adopt' else 'install_and_adopt' end,
    'active',
    trim(p_donor_name), lower(trim(p_donor_email)), nullif(trim(p_honoree_name), ''),
    trim(p_plaque_text), nullif(trim(p_notes), ''), p_timeline_ack,
    case when v_bench.installed then 3500 else 5500 end
  )
  returning * into v_row;
  return v_row;
end
$$;
