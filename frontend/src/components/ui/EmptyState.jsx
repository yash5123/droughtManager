import { InboxIcon } from 'lucide-react';

export default function EmptyState({ icon: Icon = InboxIcon, title = 'No data available', description, action }) {
  return (
    <div>
      <Icon />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
