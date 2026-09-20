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
      <button
        type="submit"
        className="rounded-full border border-forest px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-forest hover:bg-forest hover:text-white"
        title="Demo only — no real payment"
      >
        + $10,000
      </button>
    </form>
  );
}
