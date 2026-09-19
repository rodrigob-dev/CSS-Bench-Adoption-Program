import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Wallet } from "@/components/Wallet";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Adopt a Bench — Van Cortlandt Park",
  description: "See which benches in Van Cortlandt Park are adopted, by whom and for how long — and adopt one yourself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-emerald-900/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight text-emerald-900">Adopt a Bench</span>
              <span className="hidden text-sm text-emerald-900/60 sm:inline">Van Cortlandt Park</span>
            </Link>
            <Wallet />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-emerald-900/50">
          Bench inventory is seed data; VCPA would replace it with their real records. Prices and terms from the VCPA FAQ.
        </footer>
      </body>
    </html>
  );
}
