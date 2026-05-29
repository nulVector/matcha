import { Avatar, AvatarFallback, AvatarImage } from "@matcha/ui/components/avatar";
import { cn } from "@matcha/ui/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  username?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ 
  avatarUrl, 
  username, 
  className,
  fallbackClassName 
}: UserAvatarProps) {
  const fallbackChar = (username || "?").charAt(0).toUpperCase();
  const displayName = username || "User";

  return (
    <Avatar className={cn("shadow-sm border border-border/50", className)}>
      <AvatarImage 
        src={avatarUrl || undefined} 
        alt={`${displayName}'s avatar`} 
      />
      <AvatarFallback className={cn("bg-primary/10 text-primary font-medium", fallbackClassName)}>
        {fallbackChar}
      </AvatarFallback>
    </Avatar>
  );
}