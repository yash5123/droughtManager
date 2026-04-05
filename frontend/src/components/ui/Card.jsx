import { cn } from "@/lib/utils";
import BorderGlow from './BorderGlow';

export function Card({ className, children }) {
  return (
    <BorderGlow backgroundColor="transparent" glowColor="210 80 70" glowIntensity={0.85} borderRadius={16} glowRadius={0} className={className}>
      <div className={cn("glass-card rounded-2xl overflow-hidden")}>
        {children}
      </div>
    </BorderGlow>
  );
}

export function CardContent({ className, children }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}
