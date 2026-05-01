export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title skeleton */}
      <div className="mb-10">
        <div className="h-4 w-32 bg-accent/10 rounded-full mb-3" />
        <div className="h-10 w-72 bg-border/40 rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-border/30 rounded-full mt-4" />
      </div>

      {/* Content skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-full bg-border/30 shrink-0" />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-5 w-3/4 bg-border/40 rounded-lg" />
                <div className="h-3 w-1/2 bg-border/20 rounded-full" />
                <div className="h-3 w-1/3 bg-border/20 rounded-full" />
              </div>
            </div>
            <div className="h-3 w-full bg-border/15 rounded-full mt-4" />
            <div className="h-3 w-4/5 bg-border/15 rounded-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
