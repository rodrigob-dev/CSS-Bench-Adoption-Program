# Submission notes

**Live:** https://css-bench-adoption-program-1.vercel.app (staff queue: /admin, key shared separately)
**Code:** https://github.com/rodrigob-dev/CSS-Bench-Adoption-Program

## Assumptions and design decisions (the form answer)

The park is fictional. The club's president asked for a made-up park with 500+ benches and to assume every bench's location is known, since the real ones will be surveyed for the actual rollout. So Riverbend Park has 9 areas and 532 benches with coordinates, generated from one layout file; a real park replaces the seed with its inventory.

The unit of adoption is a plaque position, not a bench. VCPA's FAQ says an 8 ft bench has two independently adoptable sides, so every adoption row carries (bench, side) and a bench can be open, half adopted or full. New benches only go in a fixed set of pre-approved spots, modelled as bench rows with `installed = false`.

Adoptions are an append-only table; nothing derived is stored. `expires_at` is computed from `adopted_at + term_years` in a view, "is it open" is "does a live row point at it", and a lapsed term or expired hold is flipped lazily on the next write to that side. No cron.

The database, not the app, prevents double booking. A partial unique index on `(bench_id, side) where status in ('held','pending','active')` rejects the second concurrent write with SQLSTATE 23505. `scripts/race-test.mts` fires 8 concurrent adoptions at one plaque and asserts exactly one wins.

A plaque is reserved when its form opens, for 10 minutes, under a per-browser token (no accounts). Submitting turns the hold into a pending request; park staff approve it in `/admin` (that starts the ten-year term) or reject it (the plaque reopens). Payment is confirmed by staff at review, as the program does today with its Google Form. Other visitors see a pending plaque as "not available", nothing more.

UX rule: the brief's two jobs, see who adopted what and adopt a bench, are each within two clicks of the first screen, which is the map itself. Click a pin for status, donor and term; one more click opens the bench page with the form open and the plaque held. The bench page is a real photograph per area with the plaques drawn on the rail, and the text sizes itself to fit the plate as you type.

Out of scope, documented as next steps: email confirmations are wired (SMTP) but need credentials; a payment link on approval; per-staff logins with an audit trail.

Full reasoning, with the alternative considered for each choice: `DECISIONS.md` (19 entries).
