interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function PlayerProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card p-6 flex gap-6 items-center">
        <LoadingSkeleton className="w-24 h-24 rounded-md" />
        <div className="flex-1 space-y-3">
          <LoadingSkeleton className="h-6 w-64" />
          <LoadingSkeleton className="h-4 w-32" />
          <LoadingSkeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <LoadingSkeleton className="h-32" />
        <LoadingSkeleton className="h-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

export function MatchListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-20" />
      ))}
    </div>
  );
}

export function ChampionsSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {Array.from({ length: 24 }).map((_, i) => (
        <LoadingSkeleton key={i} className="aspect-square" />
      ))}
    </div>
  );
}
