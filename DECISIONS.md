# Design decisions

What was decided, why, and what the alternative was. Short on purpose; the
schema and code carry the detail.

## The park is fictional, every bench has a position

The brief asks to simulate the service for a park with 500+ benches whose
locations are all known. So `benches` carries `pos_x`/`pos_y` in park-local
metres and every bench is a pin on a schematic map (MapLibre, no tiles).
When a real survey lands, that becomes `lat`/`lng` plus a tile layer; the
adoption model does not change.

## A bench side is the unit of adoption

VCPA's FAQ: an 8 ft bench has two independently adoptable sides, a 4 ft bench
has one. So every adoption row carries `(bench_id, side)` and a bench can be
open, half adopted or full. *Alternative:* adopt whole benches. Simpler, and
wrong on the first 8 ft bench with two donors.

## Adoptions are rows, not flags on the bench

`benches` is the physical object, `adoptions` is an append-only log. A bench
keeps its history when a term ends and someone else adopts. *Alternative:*
`adopted_by` / `adopted_until` columns on `benches`, which lose the previous
donor the moment a term ends.

## The database prevents double booking

Two people load the page, both see a plaque open, both click. Checking in
application code cannot help: the read and the write are two round trips.
The fix is one partial unique index:

```sql
create unique index one_live_adoption_per_side
  on adoptions (bench_id, side) where status in ('held', 'pending', 'active');
```

The `where` means only live rows compete; history can pile up. The loser
gets SQLSTATE `23505`, which the app shows as "someone is adopting this
plaque". `npm run race-test` fires 8 concurrent adoptions at one plaque and
asserts exactly one wins.

## A plaque is held when its form opens, for 10 minutes

Three moments were possible:

- On bench click: too early, browsing would block both plaques for everyone.
- On submit: correct but unkind, two people could each write for ten minutes
  and one loses at the last click.
- On plaque click, when the form opens: intent is explicit. This is the one.

The hold is a row with `status = 'held'`, a per-browser token in an httpOnly
cookie (no accounts, so the token is the identity) and `held_until`. The
same unique index covers it. Submitting converts the hold in place,
cancelling releases it, silence lets it lapse. Ten minutes is one constant
in `hold_plaque()`.

## Submitting creates a request, not an adoption

The real program takes payment offline and reads plaque text by hand, so the
moment of truth is staff confirmation. A submission becomes `pending` and
keeps the plaque. In `/admin` (shared key, httpOnly cookie) staff **approve**
(row becomes `active`, `adopted_at` is stamped, the ten-year term starts) or
**reject** (row becomes `cancelled`, plaque reopens). For a new bench they
later **mark it installed**, which opens its second plaque. Other visitors
see a pending plaque as taken and nothing more.

Missing for a real rollout: a payment link on approval, per-staff logins with
an audit trail. Email on each transition is wired and needs SMTP credentials.

## Nothing derived is stored, and expiry is lazy

No `is_adopted`, no `expires_at` column. The `bench_sides` view computes
both from `adopted_at + term_years`. A lapsed term reads as open; the stale
row is flipped to `expired` by `sweep_side()` at the start of the next write
on that side, in the same transaction, so the index never blocks a
legitimate re-adoption. Lapsed holds are swept the same way. *Alternative:* a
nightly job. More moving parts, and stale status between runs.

## All writes go through SQL functions

`hold_plaque()`, `adopt_bench()`, `review_adoption()`, `set_installed()`.
Each validates, sweeps, and writes in one transaction. The app never
assembles an adoption row, so the business rules sit next to the constraints
that enforce them, and the race test calls exactly what the UI calls.
Plaque limits (7 lines, 300 characters) and `term_years` (default 10) are
columns and check constraints, so a future 5-year option is a data change.

## New benches go in fixed spots

The FAQ allows new benches only at a limited set of pre-approved locations.
Those are bench rows with `installed = false` (12 on the Great Lawn edge),
drawn as dashed pins. Adopting one is an `install_and_adopt` at $5,500. Only
side A is offered until the park marks the bench installed.

## The inventory is generated from one file

`src/lib/park.ts` defines nine areas, their paths, the lake, bench counts and
photo backdrops. `scripts/generate-seed.mts` spaces each area's benches along
its paths and writes `supabase/seed.sql`. The rules are stated in the script
(every 3rd bench concrete, every 4th 4 ft, `setseed(0.42)`), so the seed is
reproducible and re-runnable. The public demo seeds no adoptions so anyone
with the link can go through the whole flow; `SEED_ADOPTIONS=1` fills the
park in at per-area rates. A real park replaces this with its own records.

## Server-only data access

The Next.js server talks to Supabase with the service-role key; the browser
never touches the database. No connection-pool pitfalls on serverless,
Postgres error codes come through directly, and row-level security is not
needed.

## The bench page is a photograph

Tried: a CSS illustration (read as clip art) and a cut-out bench over per-area
backgrounds (lighting never matched). Shipped: one photograph per kind of
area with the plaques drawn on the rail at measured anchor points
(`src/lib/scenes.ts`). The camera is a CSS transform; plaque text sizes
itself to fit the plate. A real park photographs each bench once and records
the same two anchors.

## Two jobs, two clicks each

The brief names two jobs: see who adopted what, and adopt. So the first
screen is the map, not a landing page. See: click a pin, the panel shows
status, donor and term. Adopt: one more click opens the bench page with the
form open and the plaque held. Removed to get there: the marketing landing
(now `/about`), a demo wallet, navigation delays, half the copy.
