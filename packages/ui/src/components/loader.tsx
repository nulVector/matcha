import { cn } from "@matcha/ui/lib/utils";
import { Loader2, type LucideProps } from "lucide-react";

interface LoaderProps extends Omit<LucideProps, "size"> {
  size?: "sm" | "default" | "lg";
  fullScreen?: boolean;
  inline?: boolean;
}

export function Loader({ className, size = "default", fullScreen = false, inline = false, ...props }: LoaderProps) {
  const sizeClasses = {
    sm: "size-4",
    default: "size-8",
    lg: "size-12",
  };

  const spinner = (
    <Loader2 
      aria-label="Loading..."
      className={cn("animate-spin text-current", sizeClasses[size], className)} 
      {...props} 
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-100 text-primary">
        {spinner}
      </div>
    );
  }

  if (inline) return spinner;
  return (
    <div className="flex w-full items-center justify-center p-4 text-primary">
      {spinner}
    </div>
  );
}