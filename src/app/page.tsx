import Link from "next/link";
import { CountUp, Reveal } from "@/components/motion";
import { PARK } from "@/lib/park";
import { getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FAQ: [string, string][] = [
  ["How do I find where benches are available?", "Open the park map. Every bench is a pin: blue is open, grey is adopted, a hollow pin has one of its two plaques open. Pick an area to zoom in, then click a bench to see it up close."],
  ["What does adoption cost?", "Adopting an existing bench with a personalized plaque is $3,500. Installing a new bench with a plaque is $5,500 and up; new bench locations are limited to pre-approved spots and are subject to approval by NYC Parks. Your donation is fully tax deductible."],
  ["How long does a plaque stay on the bench?", "Bench adoption is for a term of 10 years. The park will make repairs to your bench during that time. On occasion a bench may need to be removed for capital improvements; we will work with you to relocate your plaque."],
  ["What can the plaque say?", "Up to seven lines and 300 characters. Large amounts of text make the font smaller and harder to read — you can see exactly how it will look as you type."],
  ["An 8 ft bench has two plaques?", "Yes. World's Fair and concrete-base benches come in 8 ft and 4 ft sizes. On an 8 ft bench each side of the top rail carries its own plaque, so two donors can share a bench; a 4 ft bench has a single plaque."],
  ["How long does installation take?", "About 6–8 weeks for a plaque on an existing bench, and about 3 months for a new bench. We cannot guarantee a completion date, although we will do our very best."],
];

export default async function HomePage() {
  const areas = await getAreas();
  const totals = areas.reduce(
    (t, a) => ({ benches: t.benches + a.benches_total, open: t.open + a.sides_open, slots: t.slots + a.slots_open }),
    { benches: 0, open: 0, slots: 0 },
  );

  return (
    <>
      {/* hero */}
      <section className="relative isolate overflow-hidden bg-forest-deep text-white">
        <div className="absolute inset-0 bg-[url('/bench/bg/meadow.jpg')] bg-cover bg-[center_65%]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/60 to-forest-deep/20" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:pb-24 sm:pt-32">
          <p className="hero-in mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-lime-soft">Tribute giving</p>
          <h1 className="hero-in font-display text-6xl font-black uppercase leading-[0.9] tracking-tight sm:text-8xl" style={{ animationDelay: "120ms" }}>Adopt-A-Bench</h1>
          <p className="hero-in mt-5 max-w-xl text-xl leading-snug text-white/90 sm:text-2xl" style={{ animationDelay: "260ms" }}>
            Tell your story in {PARK.name} and help maintain the park&apos;s {totals.benches}+ benches and their surrounding landscapes.
          </p>
          <div className="hero-in mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: "400ms" }}>
            <Link href="/map" className="btn-pop rounded-full bg-lime px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-ink">
              Find a bench
            </Link>
            <span className="text-white/80">
              <CountUp value={totals.open} className="font-display text-2xl font-bold text-white" /> plaques open right now
            </span>
          </div>
        </div>
      </section>

      {/* intro */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[3fr_2fr] md:items-start">
        <Reveal className="space-y-5 text-lg leading-relaxed text-ink/85">
          <h2 className="font-display text-4xl font-extrabold uppercase tracking-tight text-forest">Honor. Commemorate. Propose.</h2>
          <p>
            The Adopt-A-Bench program provides funding to maintain and endow the care of {PARK.name}&apos;s benches and the
            landscapes around them. A personalized plaque is installed on the bench of your choice for a ten-year term.
          </p>
          <p>
            Every bench in the park is on our map, with its current status: open, adopted, or half adopted on an 8 ft bench.
            Choose the exact bench — and the exact plaque — you want, see your text on it before you commit, and submit your
            adoption in minutes.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <dl className="grid grid-cols-3 gap-4 rounded-2xl bg-sand p-6 md:grid-cols-1">
            <Stat value={totals.benches} label="benches in the park" />
            <Stat value={totals.open} label="plaques open" accent />
            <Stat value={totals.slots} label="spots for a new bench" />
          </dl>
        </Reveal>
      </section>

      {/* options */}
      <section className="bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Reveal><h2 className="mb-8 font-display text-4xl font-extrabold uppercase tracking-tight text-forest">Two ways to give</h2></Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            <Tier
              title="Bench adoption"
              price="$3,500"
              body="A personalized plaque is installed on an existing bench in the park. Choose any open plaque on the map. Estimated time to install: 6–8 weeks."
              cta="Choose a bench"
              href="/map"
            />
            <Tier
              title="Bench installation & adoption"
              price="$5,500 and up"
              body="A new bench with a personalized plaque is installed in a pre-approved location on the edge of the Great Lawn. Limited spots; subject to approval by NYC Parks. About 3 months."
              cta="See available spots"
              href="/areas/great-lawn"
              delay={150}
            />
          </div>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-16">
        <Reveal><h2 className="mb-6 font-display text-4xl font-extrabold uppercase tracking-tight text-forest">Frequently asked questions</h2></Reveal>
        <div className="divide-y divide-black/10 border-y border-black/10">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-bold uppercase tracking-wide text-ink">
                {q}
                <span className="text-forest transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl leading-relaxed text-ink/80">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/map" className="btn-pop inline-block rounded-full bg-forest px-8 py-3 font-display text-lg font-bold uppercase tracking-wide text-white hover:bg-forest-deep">
            Find a bench
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <dd className={`font-display text-4xl font-black ${accent ? "text-forest" : "text-ink"}`}><CountUp value={value} /></dd>
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink/60">{label}</dt>
    </div>
  );
}

function Tier({ title, price, body, cta, href, delay = 0 }: { title: string; price: string; body: string; cta: string; href: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="flex flex-col rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-lg">
      <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink">{title}</h3>
      <p className="mt-1 font-display text-4xl font-black text-forest">{price}</p>
      <p className="mt-4 flex-1 leading-relaxed text-ink/80">{body}</p>
      <Link href={href} className="btn-pop mt-6 inline-block self-start rounded-full bg-lime px-5 py-2.5 font-display font-bold uppercase tracking-wide text-ink">
        {cta}
      </Link>
    </Reveal>
  );
}
