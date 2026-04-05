import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
      <div className="skeleton w-14 h-14 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-7 w-16 rounded" />
      </div>
    </div>
  );
}
