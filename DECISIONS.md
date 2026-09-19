# Design decisions & assumptions

Running log of every decision made while building this. Each entry: what was
decided, why, and what the alternative was. Written to be lifted into the
"assumptions / design decisions" answer.

## 1. The unit of adoption is a bench *side*, not a bench

VCPA's FAQ says an 8 ft bench has two independently adoptable sides and a 4 ft
bench has one. So "adopted" is not a boolean on a bench: an 8 ft bench can be
open, half adopted or fully adopted. Every adoption row carries `(bench_id,
side)`, and the UI derives a bench's colour from its sides. Alternative: treat
the bench as the unit and ignore sides — simpler, but wrong per the FAQ, and
VCPA would hit it on the first 8 ft bench with two donors.

## 2. Adoptions are their own table, never a flag on the bench

`benches` describes the physical object; `adoptions` records events. Rows are
never deleted or overwritten, so a bench keeps its history (the seed includes
already-expired adoptions from 15-20 years ago on ~8% of sides). Alternative:
`adopted_by` / `adopted_until` columns on `benches` — loses history the moment
a term ends and someone else adopts.

## 3. Concurrency is solved by the database, not by the app

Two people can load the same list, both see side A open, both click adopt.
Checking in application code before writing does not help: the read and the
write are two trips and another request can land in between. The fix is a
partial unique index:

```sql
create unique index one_active_adoption_per_side
  on adoptions (bench_id, side) where status = 'active';
```

The `where` makes it partial, so it only constrains *active* rows and history
rows can pile up. The second concurrent insert fails with SQLSTATE `23505`
inside the same statement, and the server action turns that into "someone
just adopted this side, pick another". `scripts/race-test.ts` fires two
adoptions at the same side concurrently and asserts exactly one wins.
Postgres and SQLite support partial indexes; MySQL does not.

## 4. Nothing derived is stored: no `is_adopted`, no `expires_at`

Both are functions of existing data. `expires_at = adopted_at + term_years`
is computed in the `bench_sides` view; "is this side open" is "does an active,
unexpired row point at it". Storing them would need a cron job and would
introduce a bug class where the flag disagrees with the rows.

## 5. Expiry is lazy: computed on read, flipped on write

A row keeps `status = 'active'` after its term lapses. On read, the view
reports a lapsed side as `open`. On write, `adopt_bench()` first updates any
lapsed active row on that side to `expired`, then inserts — both in one
transaction, so the partial index never blocks a legitimate re-adoption and
no scheduled job is needed. The seed deliberately includes ~40 active rows
older than 10 years so this path is exercised out of the box. Alternative: a
nightly job that expires rows — more moving parts, and the site would show
stale status between runs.

## 6. `term_years` is a column, defaulting to 10

VCPA's term is 10 years today. Keeping it per-row means a future 5-year or
lifetime option is a data change, not a migration.

## 7. All writes go through one SQL function, `adopt_bench()`

It validates the side exists for the bench size, expires a lapsed row, picks
the adoption kind (`adopt` vs `install_and_adopt`) and the amount from the
bench's `installed` flag, and inserts. The app never assembles an adoption row
itself. That keeps the business rules next to the constraints that enforce
them and makes the race-test meaningful (it calls the same function the UI
calls).

## 8. "Install & adopt" is a fixed set of slots, not a click-anywhere handler

The FAQ says new benches only go in a limited number of pre-approved
locations on the Parade Ground perimeter. Those are modelled as bench rows
with `installed = false` (`PG-SLOT-01..12`). Adopting one produces an
`install_and_adopt` adoption at $5,500 and the bench stays `installed = false`
until VCPA installs it (a flag flip on their side; installation takes ~3
months per the FAQ). While not installed, only side A is offered — the
install donor takes it; side B opens once the bench physically exists.

## 9. Area is the navigation layer; the bench is still the record

The brief says "view which benches are adopted", but even Central Park does
not map individual benches — it publishes availability per area. So the map
shows areas with counts; clicking an area lists its benches with per-side
status, donor and remaining term. No coordinates are faked for 500 benches.
Mapping every bench is genuinely how VCPA would do it eventually (one
afternoon per section with a phone and a GPS logger), and the schema is ready
for it — add `lat`/`lng` to `benches` and swap the area marker for pins.

## 10. Real map tiles (Leaflet + OpenStreetMap), approximate area centroids

A live map costs about the same as a static image and gives a real park
context. No API key needed. The nine area centroids are approximate
(eyeballed from the park map) and clearly labelled as such; VCPA would
replace them with polygons from their GIS.

## 11. Seed data is invented, deterministic and documented

There is no public list of Van Cortlandt Park benches. The seed generates 520
installed benches across 9 areas with counts that roughly track how busy each
part of the park is, plus 12 install slots. Style (every 3rd is concrete
base), size (every 4th is 4 ft) and adoption rate (~35% of sides) follow
stated rules, and `setseed(0.42)` makes the pseudo-random parts reproducible.
VCPA would replace it with their real inventory on day one. Alternative: 500
random benches on a grid — looks like data, explains nothing.

## 12. No auth, no payment; a fake wallet in a cookie

The brief excludes payment. To make the adopt flow usable, a "+$10,000"
button credits a per-browser wallet stored in a cookie; adopting deducts the
price ($3,500 existing / $5,500 install). The wallet is intentionally not in
the database: it is a demo affordance, not a domain fact, and there are no
user accounts to attach it to. The pledged amount *is* recorded on the
adoption row (`amount_usd`), because that is part of the donation record VCPA
would keep even with payment handled offline.

## 13. Data access: supabase-js from the server only

The Next.js server talks to Supabase over its REST API with the service-role
key (never shipped to the browser). This avoids connection-pool pitfalls of
raw Postgres drivers on serverless, and surfaces Postgres error codes
(`error.code === '23505'`) directly. Row-level security is not needed because
the browser never talks to the database.

## 14. Plaque text limit is enforced in the database

VCPA allows up to 7 lines. A check constraint on `adoptions.plaque_text`
(≤ 7 lines, ≤ 400 chars) enforces it regardless of which client writes; the
form mirrors it with a live line counter.

## 15. Scope cut

- No admin UI (marking a slot as installed, cancelling an adoption) — those
  are a `status`/`installed` update VCPA staff would do; the schema supports
  them, the UI does not expose them.
- No search/filter beyond area.
- No accounts, so "my adoptions" does not exist.
