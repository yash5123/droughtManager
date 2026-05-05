import React from 'react';
import { InboxIcon } from 'lucide-react';

export default function EmptyState({ icon: Icon = InboxIcon, title = 'No data available', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-[var(--color-text-muted)] mb-4" />
      <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--color-text-muted)] max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
