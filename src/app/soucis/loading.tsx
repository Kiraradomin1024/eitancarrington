export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="mb-10">
        <div className="h-4 w-20 bg-accent/10 rounded-full mb-3" />
        <div className="h-10 w-40 bg-border/40 rounded-xl" />
        <div className="h-4 w-64 max-w-full bg-border/30 rounded-full mt-4" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 bg-border/40 rounded-lg" />
              <div className="h-5 w-16 bg-danger/10 rounded-full" />
            </div>
            <div className="h-3 w-full bg-border/15 rounded-full" />
            <div className="h-3 w-2/3 bg-border/15 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
