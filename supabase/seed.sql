-- Bench Adoption Program — seed data
-- There is no public list of Van Cortlandt Park benches, so this is invented
-- data with a documented shape. VCPA would replace it with their real
-- inventory on day one. Everything below is reproducible: setseed() fixes the
-- pseudo-random sequence, so re-running produces the same dataset.
--
-- Rules used:
--   * 8 areas with approximate map centroids; per-area counts roughly track
--     how busy each part of the park is (520 installed benches total).
--   * Bench ids are sequential inventory tags (VC-0001 .. VC-0520).
--   * Style: every 3rd bench is concrete-base, the rest World's Fair.
--   * Size: every 4th bench is 4 ft (one side), the rest 8 ft (two sides).
--   * 12 pre-approved install slots on the Parade Ground perimeter (PG-SLOT-xx),
--     installed = false. 3 of them are already taken.
--   * ~35% of sides carry an active adoption, dated 0-12 years ago, 10-year
--     term. Adoptions older than 10 years therefore read as 'open' — that is
--     the lazy-expiry path being exercised by the seed itself.
--   * ~8% of sides also carry an older, already-expired adoption, to show
--     that history is kept.

select setseed(0.42);

insert into areas (id, name, description, lat, lng, sort_order) values
  ('parade-ground',    'Parade Ground',            'The big open lawn by W 242nd St. Most-visited section of the park; also the only area with pre-approved slots for new benches.', 40.8895, -73.8955, 1),
  ('van-cortlandt-lake','Van Cortlandt Lake',      'Benches along the lakeshore path and near the boathouse.',                                                 40.8875, -73.8865, 2),
  ('nature-center',    'Nature Center & Museum',   'Around the Van Cortlandt House Museum and the nature center lawn.',                                        40.8862, -73.8935, 3),
  ('putnam-trail',     'Putnam Trail & Tibbetts Brook', 'Along the old rail bed and the wetland boardwalk.',                                                   40.8925, -73.8895, 4),
  ('old-croton-aqueduct','Old Croton Aqueduct Trail','Shaded trail benches on the aqueduct path.',                                                            40.8945, -73.8855, 5),
  ('croton-woods',     'Croton Woods',             'Forest trail benches on the east side.',                                                                   40.8985, -73.8825, 6),
  ('shandler-rec-area','Shandler Recreation Area', 'Ballfields and picnic area north of the golf course.',                                                    40.9005, -73.8875, 7),
  ('indian-field',     'Indian Field',             'Athletic fields and picnic groves in the northeast corner.',                                              40.9035, -73.8775, 8),
  ('northwest-forest', 'Northwest Forest',         'Quiet trail benches in the far northwest.',                                                                40.9025, -73.8975, 9);

-- Installed benches -----------------------------------------------------------
with plan (area_id, n, ord) as (
  values
    ('parade-ground',      110, 1),
    ('van-cortlandt-lake',  85, 2),
    ('nature-center',       55, 3),
    ('putnam-trail',        65, 4),
    ('old-croton-aqueduct', 35, 5),
    ('croton-woods',        35, 6),
    ('shandler-rec-area',   50, 7),
    ('indian-field',        50, 8),
    ('northwest-forest',    35, 9)
),
numbered as (
  select p.area_id,
         row_number() over (order by p.ord, g.i) as seq
  from plan p
  cross join lateral generate_series(1, p.n) as g (i)
)
insert into benches (id, area_id, style, size_ft, installed)
select
  'VC-' || lpad(seq::text, 4, '0'),
  area_id,
  case when seq % 3 = 0 then 'concrete' else 'worlds_fair' end,
  case when seq % 4 = 0 then 4 else 8 end,
  true
from numbered;

-- Pre-approved install slots (Parade Ground perimeter) -----------------------
insert into benches (id, area_id, style, size_ft, installed)
select 'PG-SLOT-' || lpad(i::text, 2, '0'), 'parade-ground', 'worlds_fair', 8, false
from generate_series(1, 12) as g (i);

-- Adoptions ------------------------------------------------------------------
-- One statement, no helper tables (the Supabase SQL editor is unreliable with
-- cross-statement dependencies). Donor names and plaque templates are picked
-- per row by random array index, so random() is re-evaluated for every side.
with
sides as (
  select
    b.id as bench_id,
    s.side,
    b.installed,
    random() as r_active,
    random() as r_history,
    random() as r_age,
    (array['Maria Alvarez','James O''Connor','Priya Raman','Daniel Cohen','Aisha Bello',
           'Thomas Nguyen','Rosa Delgado','Samuel Kim','Elena Petrova','Marcus Johnson',
           'Hannah Weiss','Luis Ferreira','Grace Okafor','Noah Feldman','Yuki Tanaka',
           'Patrick Murphy','Fatima Hassan','Robert Callahan','Ingrid Larsen','Carlos Mendes'])
      [1 + floor(random() * 20)::int] as donor_a,
    (array['Maria Alvarez','James O''Connor','Priya Raman','Daniel Cohen','Aisha Bello',
           'Thomas Nguyen','Rosa Delgado','Samuel Kim','Elena Petrova','Marcus Johnson',
           'Hannah Weiss','Luis Ferreira','Grace Okafor','Noah Feldman','Yuki Tanaka',
           'Patrick Murphy','Fatima Hassan','Robert Callahan','Ingrid Larsen','Carlos Mendes'])
      [1 + floor(random() * 20)::int] as donor_b,
    (array[E'In loving memory of {name}\nWho walked these paths every morning',
           E'For {name}\nThis was your favorite spot\nWe miss you',
           E'{name}\n1948 – 2019\nRest here a while',
           E'Dedicated to {name}\nCoach, neighbor, friend\nVan Cortlandt Track Club',
           E'She said yes here.\n{name}\nJune 2021',
           E'For {name}\nwho loved this park\nand everyone in it',
           E'In honor of {name}\n40 years of Saturday mornings\non the Parade Ground'])
      [1 + floor(random() * 7)::int] as plaque_a,
    (array[E'In loving memory of {name}\nWho walked these paths every morning',
           E'For {name}\nThis was your favorite spot\nWe miss you',
           E'{name}\n1948 – 2019\nRest here a while',
           E'Dedicated to {name}\nCoach, neighbor, friend\nVan Cortlandt Track Club',
           E'For {name}\nwho loved this park\nand everyone in it'])
      [1 + floor(random() * 5)::int] as plaque_b
  from benches b
  cross join (values ('A'), ('B')) as s (side)
  where s.side = 'A' or b.size_ft = 8
)
insert into adoptions (bench_id, side, kind, donor_name, plaque_text, amount_usd, adopted_at, term_years, status)
-- older, already-expired adoptions (history) on ~8% of sides
select bench_id, side, 'adopt', donor_b, replace(plaque_b, '{name}', donor_b), 2500,
       now() - interval '14 years' - (r_age * interval '6 years'), 10, 'expired'
from sides where installed and r_history < 0.08
union all
-- current adoptions on ~35% of sides, dated 0-12 years ago (some already lapsed)
select bench_id, side, 'adopt', donor_a, replace(plaque_a, '{name}', donor_a), 3500,
       now() - (r_age * interval '12 years'), 10, 'active'
from sides where installed and r_active < 0.35
union all
-- three install slots already taken (side A only until installed)
select bench_id, side, 'install_and_adopt', donor_a, replace(plaque_a, '{name}', donor_a), 5500,
       now() - (r_age * interval '2 years'), 10, 'active'
from sides where not installed and side = 'A' and bench_id in ('PG-SLOT-02', 'PG-SLOT-05', 'PG-SLOT-09');
