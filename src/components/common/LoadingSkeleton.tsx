import React from 'react';

interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'table' | 'avatar' | 'button';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'text',
  count = 1,
  className = ''
}) => {
  const skeletons = Array.from({ length: count });
  // Compute the random bar widths once per `count`, not on every render —
  // re-rolling each render causes visual jitter and breaks render purity.
  const textWidths = React.useMemo(
    () => Array.from({ length: count }, () => Math.random() * 40 + 60),
    [count]
  );

  if (type === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {textWidths.map((w, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`space-y-4 ${className}`}>
        {skeletons.map((_, i) => (
          <div key={i} className="card bg-base-100 border border-slate-200 p-6">
            <div className="h-6 bg-slate-200 rounded animate-pulse w-1/3 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
              <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-slate-200 rounded animate-pulse w-4/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`overflow-hidden ${className}`}>
        <div className="animate-pulse">
          {/* Table Header */}
          <div className="flex gap-4 p-4 bg-slate-100 border-b">
            <div className="h-4 bg-slate-200 rounded w-1/6" />
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-200 rounded w-1/6" />
            <div className="h-4 bg-slate-200 rounded w-1/6" />
            <div className="h-4 bg-slate-200 rounded w-1/6" />
          </div>
          {/* Table Rows */}
          {skeletons.map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b">
              <div className="h-4 bg-slate-200 rounded w-1/6" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-4 bg-slate-200 rounded w-1/6" />
              <div className="h-4 bg-slate-200 rounded w-1/6" />
              <div className="h-4 bg-slate-200 rounded w-1/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {skeletons.map((_, i) => (
          <div key={i} className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  if (type === 'button') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {skeletons.map((_, i) => (
          <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse w-24" />
        ))}
      </div>
    );
  }

  return null;
};

// Composite skeleton for dashboard
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* Header Skeleton */}
    <div className="flex justify-between items-end">
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 rounded animate-pulse w-64" />
        <div className="h-4 bg-slate-200 rounded animate-pulse w-48" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded animate-pulse w-24" />
        <div className="h-6 bg-slate-200 rounded animate-pulse w-32" />
      </div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card bg-base-100 border border-slate-200 p-4">
          <div className="h-3 bg-slate-200 rounded animate-pulse w-24 mb-2" />
          <div className="h-8 bg-slate-200 rounded animate-pulse w-16" />
        </div>
      ))}
    </div>

    {/* Leaderboard Skeleton */}
    <LoadingSkeleton type="table" count={8} />
  </div>
);

// Composite skeleton for form
export const FormSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="h-10 bg-slate-200 rounded animate-pulse w-full" />
    <div className="h-10 bg-slate-200 rounded animate-pulse w-full" />
    <div className="h-10 bg-slate-200 rounded animate-pulse w-full" />
    <div className="h-10 bg-slate-200 rounded animate-pulse w-32" />
  </div>
);
