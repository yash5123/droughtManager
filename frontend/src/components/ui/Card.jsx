import { cn } from "../../App";

export function Card({ className, children }) {
  return (
    <div className={cn("glass-card rounded-2xl overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}
