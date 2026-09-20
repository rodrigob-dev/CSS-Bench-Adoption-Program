import type { Metadata } from "next";
import Link from "next/link";
import { Barlow_Condensed, Barlow_Semi_Condensed, EB_Garamond } from "next/font/google";
import { Wallet } from "@/components/Wallet";
import { PARK } from "@/lib/park";
import "./globals.css";

// Central Park Conservancy sets Gotham Condensed / Gotham Narrow. Barlow is the
// closest open pairing: condensed black for display, semi-condensed for text.
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const body = Barlow_Semi_Condensed({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600"] });
const plaque = EB_Garamond({ variable: "--font-plaque", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: `Adopt-A-Bench — ${PARK.name}`,
  description: `Tell your story in ${PARK.name}. See which benches are adopted, by whom and for how long — and adopt one yourself.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${plaque.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M12 2c-2 4-6 6-6 11a6 6 0 0 0 5 5.9V22h2v-3.1A6 6 0 0 0 18 13c0-5-4-7-6-11z" /></svg>
              </span>
              <span className="leading-none">
                <span className="block font-display text-lg font-extrabold uppercase tracking-wide text-forest">{PARK.name} Alliance</span>
                <span className="block text-xs font-medium uppercase tracking-widest text-ink/60">Adopt-A-Bench</span>
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-semibold uppercase tracking-wide text-ink/80">
              <Link href="/" className="hidden hover:text-forest md:inline">Program</Link>
              <Link href="/#faq" className="hidden hover:text-forest md:inline">FAQ</Link>
              <Link href="/map" className="btn-pop rounded-full bg-lime px-4 py-2 text-ink">Find a bench</Link>
            </nav>
            <Wallet />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/5 bg-forest text-white/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm">
            <div>
              <div className="font-display text-xl font-extrabold uppercase tracking-wide text-white">{PARK.name} Alliance</div>
              <div className="text-white/60">A fictional park built to simulate the bench adoption service. Prices and terms follow the VCPA program.</div>
            </div>
            <div className="text-xs text-white/50">Bench and park photography via Unsplash — see public/bench/CREDITS.md</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
