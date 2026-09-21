# Adopt a Bench, Riverbend Park

A single source of truth for a park bench adoption program: see which of the
park's 500+ benches are adopted, by whom and until when, and adopt one
yourself. Riverbend Park is fictional, the brief simulates the service for a
park whose benches have all been mapped, so every bench has a position.

**Live:** https://css-bench-adoption-program-1.vercel.app, staff queue at /admin

## What it does

- **Every bench on the map, on the first screen.** All 532 benches are
  pins: blue open, half-blue one of two plaques open, grey adopted, dashed a
  spot for a new bench. Hover shows the donor; click shows status, donor and
  term in the side panel. Search jumps to a bench id or an area.
- **Bench page.** Each adoptable *side* shows the donor, the plaque text, the
  adoption date and when the term ends, or an adoption form if it is open.
- **Adopt in two clicks.** "Adopt this plaque" in the panel opens the bench
  page with the form open and the plaque held for you for 10 minutes. The
  form is VCPA's (plaque text up to 7 lines / 300 characters, name, email,
  the 6–8 week acknowledgement; honoree and notes optional). Your text
  appears on a photo of the bench as you type. $3,500 for an existing bench,
  $5,500 for a new one, ten-year term, no payment online.
- **Install & adopt.** The Great Lawn has 12 pre-approved spots for new
  benches along its edge, shown as dashed pins and their own cards.
- **Staff queue.** A submission is a *request*: the plaque is held and the
  request appears in `/admin` (shared staff key), where the park approves
  it (the 10-year term starts then), rejects it (the plaque reopens), or
  records that a new bench has been installed.

## How it is built

Next.js 16 (App Router, server components + server actions), Supabase
Postgres, Leaflet (`CRS.Simple`, no tiles), Tailwind. Deployed on Vercel.

```
supabase/schema.sql      tables, constraints, the partial unique index, views, adopt_bench()
supabase/seed.sql        GENERATED seed: 9 areas, 520 benches + 12 slots with positions, ~480 adoptions
src/lib/park.ts          the park: areas, paths, lake — the map and the seed both read it
scripts/generate-seed.mts  places benches along each area's paths → supabase/seed.sql
src/lib/queries.ts       reads (area_summary, bench_sides views)
src/app/actions.ts       the one write: adoptBench → adopt_bench() RPC
src/app/                 /  ·  /areas/[id]  ·  /benches/[id]
scripts/race-test.mts     8 concurrent adoptions of the same side → exactly 1 wins
DECISIONS.md             every design decision, with the alternative considered
```

### Data model in one paragraph

`benches` is the physical inventory (id, area, style, 4/8 ft, installed flag,
position).
`adoptions` is an append-only event log keyed by `(bench_id, side)`, with
`adopted_at`, `term_years`, `status`. The unit of adoption is a bench **side**
because an 8 ft bench has two. Nothing derived is stored: the `bench_sides`
view computes `expires_at` and whether a side is open. The only write path is
the SQL function `adopt_bench()`, and the only thing that prevents two people
adopting the same side at the same time is a partial unique index:

```sql
create unique index one_live_adoption_per_side
  on adoptions (bench_id, side) where status in ('held', 'active');
```

See [DECISIONS.md](DECISIONS.md) for the reasoning behind each of these.

## Running it

```bash
npm install
cp .env.example .env.local     # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_KEY (for /admin)
# in the Supabase SQL editor: run supabase/schema.sql, then supabase/seed.sql (both re-runnable)
npm run dev
npm run generate-seed          # only if you change the park layout in src/lib/park.ts
```

Prove the concurrency guarantee against your database:

```bash
npm run race-test
# Firing 8 concurrent adoptions at RB-0001 side A…
# winners: 1, rejected with 23505: 7, other errors: 0
# live rows on that side in the database: 1
# PASS
```

## Assumptions and design decisions

The short version, each point is expanded in [DECISIONS.md](DECISIONS.md):

1. **A bench side, not a bench, is what gets adopted.** 8 ft benches have two
   sides (VCPA FAQ), so a bench can be open, half adopted or full.
2. **Adoptions are rows, not flags.** History is kept; at most one row per
   side is active. `adopted_by`/`adopted_until` columns on the bench would lose
   the previous donor the moment a term ends.
3. **The database refuses the double adoption.** A partial unique index on
   `(bench_id, side) where status in ('held', 'active')` makes the second
   concurrent insert fail with `23505`; the app turns that into "someone is
   adopting this plaque". Checking in application code first cannot fix a
   race.
3b. **A plaque is reserved when its form opens, for 10 minutes.** Clicking a
   plaque takes a hold (same table, `status = 'held'`, per-browser token);
   submitting converts it, cancelling releases it, silence lets it lapse.
   Clicking the bench reserves nothing, that is still browsing.
3c. **Submitting creates a request, not an adoption.** It sits in a staff
   queue (`/admin`) as `pending`, still holding the plaque; approval starts
   the 10-year term, rejection reopens the plaque. The public demo seeds no
   adoptions so anyone with the link can go through the whole flow.
4. **Nothing derived is stored.** No `is_adopted`, no `expires_at`; both are
   computed on read from `adopted_at + term_years`.
5. **Expiry is lazy.** A lapsed term reads as open; the stale row is flipped
   to `expired` inside `adopt_bench()` the next time that side is adopted. No
   cron. The seed includes ~40 lapsed adoptions so this path is live.
6. **New benches go in fixed slots**, not anywhere on the map, because the
   program only allows them at pre-approved locations. A slot is a bench row
   with `installed = false`; only side A is offered until it is built.
7. **The park is fictional and every bench has a position.** The task
   simulates the service for a park whose benches have been mapped, so
   benches carry `pos_x`/`pos_y` (park-local metres) and are drawn as pins on
   a schematic map rather than on real-world tiles. A real survey swaps that
   for `lat`/`lng` plus a tile layer; the adoption model does not change.
8. **The inventory is generated, on purpose and reproducibly.** The park
   layout is one file (`src/lib/park.ts`); a script spaces each area's
   benches along its paths and writes the seed. Rules are stated (per-area
   counts, every 3rd bench concrete, every 4th 4 ft, per-area adoption rates
   from 15% to 60%, `setseed(0.42)`). A real park loads its own records.
9. **No accounts, no payment.** Payment is confirmed by staff at review,
   as the program does today. The pledged amount is recorded on the adoption
   because it is part of the donation record.
10. **Out of scope:** admin actions (marking a slot installed, cancelling), a
    "my adoptions" page, search. The schema supports the first two as plain
    updates; the UI does not expose them.
