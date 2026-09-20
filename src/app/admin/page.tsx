import { ADMIN_KEY, isAdmin } from "@/lib/admin";
import { PARK } from "@/lib/park";
import { getQueue } from "@/lib/queries";
import { adminLogout } from "./actions";
import { LoginForm } from "./LoginForm";
import { QueueRow } from "./QueueRow";

export const dynamic = "force-dynamic";

/**
 * Where adoption requests go. Staff approve (the 10-year term starts) or
 * reject (the plaque reopens), and record when a new bench has been built.
 */
export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <LoginForm />
        {!ADMIN_KEY && <p className="mt-4 text-center text-sm text-red-700">ADMIN_KEY is not set on the server, so nobody can sign in.</p>}
      </div>
    );
  }
  const queue = await getQueue();
  const areaName = Object.fromEntries(PARK.areas.map((a) => [a.id, a.name]));
  const pending = queue.filter((q) => q.status === "pending");
  const held = queue.filter((q) => q.status === "held");
  const active = queue.filter((q) => q.status === "active");

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-forest">Adoption requests</h1>
          <p className="text-ink/70">
            {pending.length} waiting for review, {held.length} forms open right now, {active.length} approved.
          </p>
        </div>
        <form action={adminLogout}>
          <button type="submit" className="text-sm text-ink/60 hover:underline">Sign out</button>
        </form>
      </div>

      <Section title="Waiting for review" empty="Nothing to review. New submissions appear here the moment a donor sends the form.">
        {pending.map((q) => <QueueRow key={q.id} item={q} areaName={areaName[q.area_id]} />)}
      </Section>
      <Section title="Forms open right now" empty="Nobody is filling in a form at the moment.">
        {held.map((q) => <QueueRow key={q.id} item={q} areaName={areaName[q.area_id]} />)}
      </Section>
      <Section title="Approved" empty="No approved adoptions yet.">
        {active.map((q) => <QueueRow key={q.id} item={q} areaName={areaName[q.area_id]} />)}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-forest">{title}</h2>
      {children.length ? <ul className="space-y-3">{children}</ul> : <p className="rounded-xl bg-sand px-4 py-3 text-sm text-ink/60">{empty}</p>}
    </section>
  );
}
