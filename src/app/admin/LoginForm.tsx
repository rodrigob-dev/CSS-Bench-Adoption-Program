"use client";

import { useActionState } from "react";
import { adminLogin } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="mx-auto max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-lg">
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide text-forest">Park staff</h1>
      <p className="text-sm text-ink/70">Enter the staff key to review adoption requests.</p>
      <label className="block text-sm">
        <span className="font-medium">Staff key</span>
        <input name="key" type="password" required autoFocus className="mt-1 w-full rounded-md border border-black/15 px-3 py-2" />
      </label>
      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-pop w-full rounded-full bg-forest px-4 py-2.5 font-display font-bold uppercase tracking-wide text-white disabled:opacity-50">
        {pending ? "Checking…" : "Open the queue"}
      </button>
    </form>
  );
}
