export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="mb-10">
        <div className="h-4 w-24 bg-accent/10 rounded-full mb-3" />
        <div className="h-10 w-52 bg-border/40 rounded-xl" />
        <div className="h-4 w-72 max-w-full bg-border/30 rounded-full mt-4" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-28 bg-border/40 rounded-lg" />
              <div className="h-4 w-20 bg-border/20 rounded-full" />
            </div>
            <div className="h-3 w-full bg-border/15 rounded-full" />
            <div className="h-3 w-3/4 bg-border/15 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
