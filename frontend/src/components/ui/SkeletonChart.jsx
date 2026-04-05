import React from 'react';

export default function SkeletonChart({ height = 'h-72' }) {
  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="skeleton h-5 w-48 mb-4 rounded" />
      <div className={`skeleton w-full ${height} rounded-xl`} />
    </div>
  );
}
