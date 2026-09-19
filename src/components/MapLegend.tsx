export function MapLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-md border border-emerald-900/10 bg-white/95 px-3 py-2 text-xs text-emerald-900/80 shadow">
      <div className="flex items-center gap-2"><Dot className="border-blue-800 bg-blue-500" /> Open</div>
      <div className="flex items-center gap-2"><Dot className="border-blue-800 bg-white" /> One of two sides open</div>
      <div className="flex items-center gap-2"><Dot className="border-gray-500 bg-gray-400" /> Adopted</div>
      <div className="flex items-center gap-2"><Dot className="border-dashed border-blue-800 bg-white" /> Spot for a new bench</div>
      {!compact && <div className="mt-1 text-[10px] text-emerald-900/50">Hover a bench for details, click to open</div>}
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`inline-block h-3 w-3 rounded-full border-2 ${className}`} />;
}
