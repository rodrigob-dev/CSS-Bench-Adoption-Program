export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8" aria-busy>
      <div className="h-10 w-72 animate-pulse rounded bg-sand" />
      <div className="h-5 w-[32rem] max-w-full animate-pulse rounded bg-sand" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-[#eef0e9] lg:aspect-auto lg:h-[680px]" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded bg-sand" />)}
        </div>
      </div>
    </div>
  );
}
