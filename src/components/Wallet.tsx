import { addFunds } from "@/app/actions";
import { formatUsd } from "@/lib/format";
import { getBalance } from "@/lib/wallet";

/** Demo wallet in the header. Server component; the button is a server action. */
export async function Wallet() {
  const balance = await getBalance();
  return (
    <form action={addFunds} className="flex items-center gap-2 text-sm">
      <span className="hidden text-ink/60 sm:inline">
        Demo wallet <span className="font-semibold text-ink">{formatUsd(balance)}</span>
      </span>
      <span className="group relative">
        <button
          type="submit"
          className="btn-pop rounded-full border border-forest px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-forest hover:bg-forest hover:text-white"
          aria-describedby="wallet-tip"
        >
          + $10,000
        </button>
        <span
          id="wallet-tip"
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 rounded-lg bg-forest-deep px-3 py-2 text-left text-xs font-medium normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Click for $10k. I wish it was this easy!
          <span className="block text-white/60">Demo wallet, no real money changes hands.</span>
        </span>
      </span>
    </form>
  );
}
