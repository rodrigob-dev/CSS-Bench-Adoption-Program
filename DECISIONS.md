# Design decisions & assumptions

Running log of every decision made while building this. Each entry: what was
decided, why, and what the alternative was. Written to be lifted into the
"assumptions / design decisions" answer.

## 1. The unit of adoption is a bench *side*, not a bench

VCPA's FAQ says an 8 ft bench has two independently adoptable sides and a 4 ft
bench has one. So "adopted" is not a boolean on a bench: an 8 ft bench can be
open, half adopted or fully adopted. Every adoption row carries `(bench_id,
side)`, and the UI derives a bench's colour from its sides. Alternative: treat
the bench as the unit and ignore sides, simpler, but wrong per the FAQ, and
the park would hit it on the first 8 ft bench with two donors.

## 2. Adoptions are their own table, never a flag on the bench

`benches` describes the physical object; `adoptions` records events. Rows are
never deleted or overwritten, so a bench keeps its history (the seed includes
already-expired adoptions from 15-20 years ago on ~8% of sides). Alternative:
`adopted_by` / `adopted_until` columns on `benches`, loses history the moment
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
lapsed active row on that side to `expired`, then inserts, both in one
transaction, so the partial index never blocks a legitimate re-adoption and
no scheduled job is needed. The seed deliberately includes ~40 active rows
older than 10 years so this path is exercised out of the box. Alternative: a
nightly job that expires rows, more moving parts, and the site would show
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

The VCPA FAQ says new benches only go in a limited number of pre-approved
locations along the edge of one area. Those are modelled as bench rows with
`installed = false` (`GL-SLOT-01..12`, on the Great Lawn edge), drawn as
dashed pins. Adopting one produces an `install_and_adopt` adoption at $5,500
and the bench stays `installed = false` until the park installs it (a flag
flip on their side; installation takes ~3 months per the FAQ). While not installed, only side A is offered, the
install donor takes it; side B opens once the bench physically exists.

## 9. The park is fictional, and every bench has a position

The service request came from a real park, but the task is to simulate the
service: a made-up park with 500+ benches, pretending each bench's location
is known (the club will map the real ones for the actual rollout). So
`benches` carries `pos_x`/`pos_y` and every bench is a pin on the map: blue
if open, hollow if one of two sides is open, grey if adopted, dashed if it is
a spot where a new bench can be installed. Areas still exist, as the grouping
layer for browsing ("separate by area") and for per-area counts.

Coordinates are park-local metres on a 1000 × 700 canvas, drawn on a
schematic map (Leaflet in `CRS.Simple`, no tiles), because a fictional park
cannot sit on real-world tiles. When the real survey lands, the change is
`pos_x/pos_y → lat/lng` and a tile layer under the same markers; nothing in
the adoption model moves.

## 10. The park layout is one file, and the seed is generated from it

`src/lib/park.ts` defines the park: nine areas with outlines, the paths
inside each area, a lake, per-area bench counts and adoption rates.
`scripts/generate-seed.mts` walks each area's paths and spaces its benches
evenly along them, alternating sides of the path, so the map reads like
benches lining a walkway rather than dots on a grid. The map draws the same
shapes. Changing the park is a data edit, then `npm run generate-seed`.

## 11. Seed data is invented, deterministic and documented

There is no bench list, by construction. The seed (`supabase/seed.sql`,
generated) states its rules: 520 installed benches across 9 areas, 12
install slots on the Great Lawn edge, every 3rd bench concrete-base, every
4th bench 4 ft, and a per-area adoption rate from 15% (North Woods) to 60%
(Great Lawn) because popularity is not uniform in a real park. `setseed()`
makes the pseudo-random parts (which sides, which donors, which dates)
reproducible, and the script starts with a `truncate` so it can be re-run.
A real park replaces it with its surveyed inventory on day one.

## 12. No auth, no payment; a fake wallet in a cookie

The brief excludes payment. To make the adopt flow usable, a "+$10,000"
button credits a per-browser wallet stored in a cookie; adopting deducts the
price ($3,500 existing / $5,500 install). The wallet is intentionally not in
the database: it is a demo affordance, not a domain fact, and there are no
user accounts to attach it to. The pledged amount *is* recorded on the
adoption row (`amount_usd`), because that is part of the donation record the
park would keep even with payment handled offline.

## 13. Data access: supabase-js from the server only

The Next.js server talks to Supabase over its REST API with the service-role
key (never shipped to the browser). This avoids connection-pool pitfalls of
raw Postgres drivers on serverless, and surfaces Postgres error codes
(`error.code === '23505'`) directly. Row-level security is not needed because
the browser never talks to the database.

## 14. Plaque text limit is enforced in the database

VCPA's program allows up to 7 lines. A check constraint on `adoptions.plaque_text`
(≤ 7 lines, ≤ 400 chars) enforces it regardless of which client writes; the
form mirrors it with a live line counter.

## 15. Scope cut

- No admin UI (marking a slot as installed, cancelling an adoption), those
  are a `status`/`installed` update park staff would do; the schema supports
  them, the UI does not expose them.
- No search/filter beyond area.
- No accounts, so "my adoptions" does not exist.

## 16. A plaque is reserved the moment the form opens, not when the bench is clicked

The question was *when* to secure a plaque so two people cannot double-book
it. Three candidate moments:

- **On bench click**, too early. Browsing a bench should not block both of
  its plaques for everyone else.
- **On submit only**, correct but unkind. Two people can spend ten minutes
  each writing a plaque and one of them loses at the last click.
- **On plaque click** (the form opens), the choice. That is the moment intent
  becomes explicit.

So opening the form takes a **10-minute hold**: a row in `adoptions` with
`status = 'held'`, a random per-browser `hold_token` (httpOnly cookie; there
are no accounts, so the token *is* the identity) and `held_until`. The same
partial unique index that guards adoptions now covers `status in ('held',
'active')`, so a second hold, or a direct adoption over someone's hold, is
rejected by the database with `23505`. Submitting converts the hold in place
(`adopt_bench` updates the held row to `active` when the token matches);
cancelling releases it; leaving lets it expire. Expiry is lazy like the
10-year term: `sweep_side()` flips lapsed holds to `cancelled` at the start
of every write on that side, so no scheduled job is needed. Other visitors
see the plaque as "being adopted now" with the time it frees up.

Ten minutes is a guess at "long enough to type seven lines, short enough
that an abandoned tab does not block a bench through lunch"; it is a single
constant in `hold_plaque()`.

## 17. The bench page is a real photograph, not a 3D model or a cut-out

The brief's grading is structure and explanation, so the bench view had to be
cheap and honest. Three options were tried: a 2.5D CSS illustration (read as
clip art), a cut-out bench composited over per-area backgrounds (lighting
and scale never matched; it looked pasted), and a whole photograph of a real
bench in each kind of area with the plaques drawn on its top rail at measured
positions. The third is what ships: four photographs (lawn, garden, woods,
lake), one per `backdrop` in `src/lib/park.ts`, with plaque anchors and a
bench bounding box per photo in `src/lib/scenes.ts`. The "camera" is a CSS
transform on the photo: overview, slide to a plaque, zoom in to edit. Plaque
text sizes itself to fit the plate, so a two-line dedication reads large and
seven lines read small, the way an engraver would set it. A real park would
photograph each bench once and record the same two anchor points.

## 18. Requests go to a staff queue; a submission is a request, not an adoption

Who does what:

- **Donor** (no account): browses the map, clicks a plaque (10-minute hold),
  fills in VCPA's form, submits. The row becomes `pending`: the plaque stays
  taken, the donor's text shows on it marked as pending, and nothing else
  happens until staff act.
- **Park staff** (`/admin`, gated by a shared `ADMIN_KEY`, there are no
  accounts, and a key in an httpOnly cookie is enough for a two-person
  office): see every live request, newest first. **Approve** flips it to
  `active` and stamps `adopted_at`, so the 10-year term starts at approval,
  not at submission. **Reject** flips it to `cancelled` and the plaque
  reopens. For a new-bench request they later **mark the bench installed**,
  which opens its second plaque.

Why a queue instead of instant adoption: the real program takes payment
offline and checks plaque text by hand, so the moment of truth is staff
confirmation. Modelling it as a status transition keeps the unique index as
the only concurrency rule (it now covers `held`, `pending` and `active`)
and gives staff a single page to work from. What is missing for a real
rollout, in order: email to the donor and staff on every transition, a
payment link on approval, and per-staff logins with an audit trail of who
approved what.

The public demo seeds no adoptions at all, so whoever gets the link can
adopt a plaque end to end and then approve it in `/admin`.

## 19. Two core functions, two clicks each

The brief names two jobs: see which benches are adopted (by whom, for how
long) and adopt one. Everything else is secondary, so the first screen is
the map itself, not a landing page, and both jobs stay within two clicks
of it:

- **See:** click a pin or a bench in the list. The panel beside the map
  shows status, donor and term without leaving the page. Hovering a pin
  already shows the donor. (1 click)
- **Adopt:** in that panel, "Adopt this plaque" opens the bench page with
  the form already open and the plaque already held. (2 clicks)

Things removed for this: the marketing landing (moved to /about), the demo
wallet (an extra "add funds" step for no reason, payment is confirmed by
staff at review anyway), the fly-then-navigate delays, and half the copy.
The form asks for what a request needs (plaque text, name, email, the
timeline acknowledgement); honoree and notes sit under "More options".
A search box jumps straight to a bench id or an area for people who already
know where they want to be.
