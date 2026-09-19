# Adopt a Bench — Van Cortlandt Park

A single source of truth for the Van Cortlandt Park bench adoption program:
see which benches are adopted, by whom and until when, and adopt one yourself.

**Live:** _(URL goes here)_

## What it does

- **Map → area → bench.** The home page shows the park with one marker per
  area, coloured by how many bench sides are still open. Clicking an area lists
  its benches: blue = open, dashed = one of two sides open, grey = adopted.
- **Bench page.** Each adoptable *side* shows the donor, the plaque text, the
  adoption date and when the term ends — or an adoption form if it is open.
- **Adopt.** Donor name + plaque text (max 7 lines, as VCPA requires). Existing
  bench $3,500, new bench $5,500, 10-year term. There is no payment: a demo
  wallet in the header adds $10,000 per click.
- **Install & adopt.** The Parade Ground has 12 pre-approved spots for new
  benches, shown as their own cards.

## How it is built

Next.js 16 (App Router, server components + server actions), Supabase
Postgres, Leaflet with OpenStreetMap tiles, Tailwind. Deployed on Vercel.

```
supabase/schema.sql      tables, constraints, the partial unique index, views, adopt_bench()
supabase/seed.sql        deterministic seed: 9 areas, 520 benches, 12 slots, ~400 adoptions
src/lib/queries.ts       reads (area_summary, bench_sides views)
src/app/actions.ts       the one write: adoptBench → adopt_bench() RPC
src/app/                 /  ·  /areas/[id]  ·  /benches/[id]
scripts/race-test.mts     8 concurrent adoptions of the same side → exactly 1 wins
DECISIONS.md             every design decision, with the alternative considered
```

### Data model in one paragraph

`benches` is the physical inventory (id, area, style, 4/8 ft, installed flag).
`adoptions` is an append-only event log keyed by `(bench_id, side)`, with
`adopted_at`, `term_years`, `status`. The unit of adoption is a bench **side**
because an 8 ft bench has two. Nothing derived is stored: the `bench_sides`
view computes `expires_at` and whether a side is open. The only write path is
the SQL function `adopt_bench()`, and the only thing that prevents two people
adopting the same side at the same time is a partial unique index:

```sql
create unique index one_active_adoption_per_side
  on adoptions (bench_id, side) where status = 'active';
```

See [DECISIONS.md](DECISIONS.md) for the reasoning behind each of these.

## Running it

```bash
npm install
cp .env.example .env.local     # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# in the Supabase SQL editor: run supabase/schema.sql, then supabase/seed.sql
npm run dev
```

Prove the concurrency guarantee against your database:

```bash
npm run race-test
# Firing 8 concurrent adoptions at VC-0001 side A…
# winners: 1, rejected with 23505: 7, other errors: 0
# active rows on that side in the database: 1
# PASS
```

## Assumptions and design decisions

The short version — each point is expanded in [DECISIONS.md](DECISIONS.md):

1. **A bench side, not a bench, is what gets adopted.** 8 ft benches have two
   sides (VCPA FAQ), so a bench can be open, half adopted or full.
2. **Adoptions are rows, not flags.** History is kept; at most one row per
   side is active. `adopted_by`/`adopted_until` columns on the bench would lose
   the previous donor the moment a term ends.
3. **The database refuses the double adoption.** A partial unique index on
   `(bench_id, side) where status = 'active'` makes the second concurrent
   insert fail with `23505`; the app turns that into "someone just adopted
   this side". Checking in application code first cannot fix a race.
4. **Nothing derived is stored.** No `is_adopted`, no `expires_at`; both are
   computed on read from `adopted_at + term_years`.
5. **Expiry is lazy.** A lapsed term reads as open; the stale row is flipped
   to `expired` inside `adopt_bench()` the next time that side is adopted. No
   cron. The seed includes ~40 lapsed adoptions so this path is live.
6. **New benches go in fixed slots**, not anywhere on the map, because VCPA
   only allows them at pre-approved Parade Ground locations. A slot is a bench
   row with `installed = false`; only side A is offered until it is built.
7. **The area is the navigation layer; the bench is the record.** Even
   Central Park publishes availability per area rather than per bench.
   Per-bench coordinates would come from VCPA walking the park with a GPS
   logger; the schema needs only `lat`/`lng` on `benches` to switch to pins.
8. **The inventory is invented, on purpose and reproducibly.** No public bench
   list exists. The seed states its rules (per-area counts, every 3rd bench
   concrete, every 4th 4 ft, ~35% of sides adopted, `setseed(0.42)`). VCPA
   replaces it with real records on day one.
9. **No accounts, no payment.** The wallet is a cookie, not a table — it is a
   demo affordance, not a domain fact. The pledged amount *is* recorded on the
   adoption because that is part of the donation record.
10. **Out of scope:** admin actions (marking a slot installed, cancelling), a
    "my adoptions" page, search. The schema supports the first two as plain
    updates; the UI does not expose them.
