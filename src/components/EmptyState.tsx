import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) => {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <div className={`p-4 rounded-2xl mb-4 ${
        isDark ? "bg-white/5" : "bg-secondary"
      }`}>
        <Icon className={`w-10 h-10 text-muted-foreground/50 ${isDark ? "glow-icon" : ""}`} />
      </div>
      <h3 className={`text-base font-semibold mb-1 ${isDark ? "text-foreground/80" : "text-foreground/70"}`}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
