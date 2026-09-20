import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-5xl font-black uppercase tracking-tight text-forest">No bench here</h1>
      <p className="mt-4 text-lg text-ink/70">
        That page or bench does not exist. Bench ids look like <span className="font-mono">RB-0042</span>; every one of them is on the map.
      </p>
      <Link href="/map" className="btn-pop mt-8 inline-block rounded-full bg-lime px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-ink">
        Open the park map
      </Link>
    </div>
  );
}
