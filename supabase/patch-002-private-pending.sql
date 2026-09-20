-- Patch 002: pending requests are private (only the requester sees their text),
-- and adopt_bench keeps the hold token so the requester can be recognised.
-- Safe to run on a populated database.

create or replace view bench_sides as
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
  -- only approved adoptions are public; a pending request shows as taken, nothing more
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
    when a.status = 'pending' then 'pending'
    when a.adopted_at + make_interval(years => a.term_years) <= now() then 'open'
    else 'adopted'
  end as side_status
from benches b
cross join (values ('A'), ('B')) as s (side)
left join adoptions a
  on a.bench_id = b.id and a.side = s.side and a.status in ('held', 'pending', 'active')
where s.side = 'A' or (b.size_ft = 8 and b.installed);


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
     set status = 'pending',
         donor_name = trim(p_donor_name),
         donor_email = lower(trim(p_donor_email)),
         honoree_name = nullif(trim(p_honoree_name), ''),
         plaque_text = trim(p_plaque_text),
         notes = nullif(trim(p_notes), ''),
         timeline_acknowledged = p_timeline_ack,
         amount_usd = case when v_bench.installed then 3500 else 5500 end,
         submitted_at = now(),
         held_until = null                    -- hold_token stays so the requester can recognise their own request
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
    'pending',
    trim(p_donor_name), lower(trim(p_donor_email)), nullif(trim(p_honoree_name), ''),
    trim(p_plaque_text), nullif(trim(p_notes), ''), p_timeline_ack,
    case when v_bench.installed then 3500 else 5500 end
  )
  returning * into v_row;
  return v_row;
end
$$;

