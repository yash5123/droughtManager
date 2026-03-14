export function Card({ className, children }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className || ''}`}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }) {
  return (
    <div className={`p-6 ${className || ''}`}>
      {children}
    </div>
  );
}
