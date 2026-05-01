export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="mb-10">
        <div className="h-4 w-20 bg-accent/10 rounded-full mb-3" />
        <div className="h-10 w-44 bg-border/40 rounded-xl" />
        <div className="h-4 w-72 max-w-full bg-border/30 rounded-full mt-4" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-border/30 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-border/40 rounded-lg" />
              <div className="h-3 w-24 bg-border/20 rounded-full" />
            </div>
            <div className="h-5 w-16 bg-accent/10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
