import { addFunds } from "@/app/actions";
import { formatUsd } from "@/lib/format";
import { getBalance } from "@/lib/wallet";

/** Demo wallet in the header. Server component; the button is a server action. */
export async function Wallet() {
  const balance = await getBalance();
  return (
    <form action={addFunds} className="flex items-center gap-3 text-sm">
      <span className="text-emerald-900/70">
        Wallet <span className="font-mono font-semibold text-emerald-900">{formatUsd(balance)}</span>
      </span>
      <button
        type="submit"
        className="rounded-md border border-emerald-700 px-3 py-1.5 font-medium text-emerald-800 hover:bg-emerald-50"
        title="Demo only — no real payment"
      >
        + $10,000
      </button>
    </form>
  );
}
