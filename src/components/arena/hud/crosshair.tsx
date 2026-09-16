/**
 * Crosshair statis di tengah layar. Belum ada logika recoil atau spread —
 * itu bagian dari task bidik & tembak.
 */
export function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="relative h-7 w-7">
        <span className="absolute top-1/2 left-0 h-px w-2 -translate-y-1/2 bg-emerald-300/90 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
        <span className="absolute top-1/2 right-0 h-px w-2 -translate-y-1/2 bg-emerald-300/90 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
        <span className="absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 bg-emerald-300/90 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
        <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-emerald-300/90 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
        <span className="absolute top-1/2 left-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200" />
      </div>
    </div>
  );
}
