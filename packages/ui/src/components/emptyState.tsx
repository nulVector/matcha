import { ReactNode } from "react";
import { cn } from "@matcha/ui/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 w-full max-w-sm mx-auto min-h-75",
        "animate-in fade-in zoom-in-95 duration-200", 
        className
      )}
    >
      <div 
        className={cn(
          "flex size-20 items-center justify-center rounded-full bg-muted/50 text-muted-foreground mb-4 shadow-sm ring-1 ring-border/50"
        )}
      >
        <div className="[&_svg]:size-8 opacity-80">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      
      <p className={cn(
        "text-sm text-muted-foreground mt-2 mb-5 leading-relaxed",
        "text-balance"
      )}>
        {description}
      </p>
      
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}